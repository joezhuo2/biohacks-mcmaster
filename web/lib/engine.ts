import physionet from '../data/physionet-strides.json';
import { db, patientId, query } from './db';
import { clamp } from './metrics';
import type { ClearanceSeries, EngineStats, GaitDay, SimilarDays } from './types';

const shared = globalThis as typeof globalThis & {
  afoIngest?: [number, number][];
  afoBench?: { at: number; rawMs: number; rollupMs: number; rows: number };
  afoGaitAt?: number;
};
const ingested = shared.afoIngest ??= [];
const windowMs = 10_000;

export function recordIngest(rows: number) {
  const now = Date.now();
  ingested.push([now, rows]);
  while (ingested.length && ingested[0][0] < now - windowMs) ingested.shift();
}

export async function refreshRollups() {
  for (const view of ['steps_1h', 'steps_1d', 'clearance_1d']) await db().query(`CALL refresh_continuous_aggregate('${view}', NULL, NULL)`);
  await db().query(`SELECT compress_chunk(c, if_not_compressed => true) FROM show_chunks('steps', older_than => INTERVAL '7 days') c`);
  await db().query(`SELECT compress_chunk(c, if_not_compressed => true) FROM show_chunks('samples', older_than => INTERVAL '3 days') c`);
}

async function explainMs(sql: string, values: unknown[]) {
  const [row] = await query<{ 'QUERY PLAN': [{ 'Execution Time': number; 'Planning Time': number }] }>(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, values);
  const plan = row['QUERY PLAN'][0];
  return plan['Execution Time'] + plan['Planning Time'];
}

async function benchmark() {
  if (shared.afoBench && Date.now() - shared.afoBench.at < 30_000) return shared.afoBench;
  const from = new Date(Date.now() - 90 * 86400000).toISOString();
  const rawMs = await explainMs(`SELECT time_bucket('1 day', time) AS bucket, count(*), avg(min_clearance_mm), avg(peak_dorsi_deg),
    avg(assist_pct), avg(stride_ms), stddev_pop(stride_ms) FROM steps WHERE patient_id=$1 AND time >= $2 GROUP BY bucket`, [patientId, from]);
  const rollupMs = await explainMs(`SELECT bucket, steps, avg_clearance_mm, avg_peak_dorsi_deg, avg_assist_pct, avg_stride_ms, stride_stddev
    FROM steps_1d WHERE patient_id=$1 AND bucket >= $2`, [patientId, from]);
  const [{ rows }] = await query<{ rows: number }>(`SELECT count(*)::int AS rows FROM steps WHERE patient_id=$1 AND time >= $2`, [patientId, from]);
  return shared.afoBench = { at: Date.now(), rawMs, rollupMs, rows };
}

export async function getEngineStats(): Promise<EngineStats> {
  recordIngest(0);
  const [bench, [compression]] = await Promise.all([benchmark(), query<{ before: number | null; after: number | null; chunks: number; compressed: number }>(`
    SELECT sum(before_compression_total_bytes)::float8 AS before, sum(after_compression_total_bytes)::float8 AS after,
      sum(total_chunks)::int AS chunks, sum(number_compressed_chunks)::int AS compressed
    FROM (SELECT * FROM hypertable_compression_stats('steps') UNION ALL SELECT * FROM hypertable_compression_stats('samples')) s`)]);
  return {
    ingestRowsPerSec: ingested.reduce((sum, [, rows]) => sum + rows, 0) / (windowMs / 1000),
    rawMs: bench.rawMs, rollupMs: bench.rollupMs, benchRows: bench.rows,
    compressionRatio: compression.before && compression.after ? compression.before / compression.after : null,
    compressedBytes: compression.after, uncompressedBytes: compression.before,
    chunks: compression.chunks, compressedChunks: compression.compressed,
  };
}

export async function getClearance(from: string): Promise<ClearanceSeries> {
  const [trace, band] = await Promise.all([
    query<{ t: string; v: number }>(`SELECT time AS t, value AS v FROM unnest((
      SELECT lttb(bucket, avg_clearance_mm, 300) FROM steps_1h WHERE patient_id=$1 AND bucket >= $2))`, [patientId, from]),
    query<{ day: string; p10: number; p50: number; p90: number }>(`SELECT to_char(bucket AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,
      approx_percentile(0.1, pct) AS p10, approx_percentile(0.5, pct) AS p50, approx_percentile(0.9, pct) AS p90
      FROM clearance_1d WHERE patient_id=$1 AND bucket >= $2 ORDER BY bucket`, [patientId, from]),
  ]);
  return { trace, band };
}

const gaitColumns = `to_char(day,'YYYY-MM-DD') AS day, clearance_mm AS "clearanceMm", dorsi_deg AS "dorsiDeg",
  stride_ms AS "strideMs", stride_cv AS "strideCv", assist_pct AS "assistPct"`;

async function rebuildGaitDays() {
  if (shared.afoGaitAt && Date.now() - shared.afoGaitAt < 60_000) return;
  await query(`WITH d AS (
      SELECT (bucket AT TIME ZONE 'UTC')::date AS day, avg_clearance_mm AS c, avg_peak_dorsi_deg AS r, avg_stride_ms AS s,
        stride_stddev / NULLIF(avg_stride_ms, 0) AS cv, avg_assist_pct AS a
      FROM steps_1d WHERE patient_id=$1 AND steps >= 50
    ), z AS (
      SELECT *, ARRAY[
        COALESCE((c - avg(c) OVER ()) / NULLIF(stddev_pop(c) OVER (), 0), 0),
        COALESCE((r - avg(r) OVER ()) / NULLIF(stddev_pop(r) OVER (), 0), 0),
        COALESCE((cv - avg(cv) OVER ()) / NULLIF(stddev_pop(cv) OVER (), 0), 0),
        COALESCE((a - avg(a) OVER ()) / NULLIF(stddev_pop(a) OVER (), 0), 0)]::vector AS embedding FROM d
    ), upsert AS (
      INSERT INTO gait_days (patient_id, day, embedding, clearance_mm, dorsi_deg, stride_ms, stride_cv, assist_pct)
      SELECT $1, day, embedding, c, r, s, COALESCE(cv, 0), a FROM z
      ON CONFLICT (patient_id, day) DO UPDATE SET embedding = EXCLUDED.embedding, clearance_mm = EXCLUDED.clearance_mm,
        dorsi_deg = EXCLUDED.dorsi_deg, stride_ms = EXCLUDED.stride_ms, stride_cv = EXCLUDED.stride_cv, assist_pct = EXCLUDED.assist_pct
    ) DELETE FROM gait_days WHERE patient_id=$1 AND day NOT IN (SELECT day FROM d)`, [patientId]);
  shared.afoGaitAt = Date.now();
}

export function alsProgress(day: Pick<GaitDay, 'strideMs' | 'strideCv'>) {
  const { controlStrideMs, alsStrideMs, controlStrideCv, alsStrideCv } = physionet;
  const stride = clamp((day.strideMs - controlStrideMs) / (alsStrideMs - controlStrideMs));
  const rhythm = clamp((day.strideCv - controlStrideCv) / (alsStrideCv - controlStrideCv));
  return { overall: (stride + rhythm) / 2, stride, rhythm };
}

export async function getSimilarDays(): Promise<SimilarDays> {
  await rebuildGaitDays();
  const [today] = await query<GaitDay & { embedding: string }>(`SELECT ${gaitColumns}, embedding::text AS embedding
    FROM gait_days WHERE patient_id=$1 ORDER BY day DESC LIMIT 1`, [patientId]);
  if (!today) return { today: null, matches: [], alsProgress: null };
  const matches = await query<GaitDay & { distance: number }>(`SELECT ${gaitColumns}, embedding <-> $2::vector AS distance
    FROM gait_days WHERE patient_id=$1 AND day < $3::date - 7 ORDER BY embedding <-> $2::vector LIMIT 3`,
    [patientId, today.embedding, today.day]);
  const day: GaitDay = { day: today.day, clearanceMm: today.clearanceMm, dorsiDeg: today.dorsiDeg,
    strideMs: today.strideMs, strideCv: today.strideCv, assistPct: today.assistPct };
  return { today: day, matches, alsProgress: alsProgress(day) };
}
