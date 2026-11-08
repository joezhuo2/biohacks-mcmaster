import physionet from '../data/physionet-strides.json';
import { db, patientId, query } from './db';
import { clamp } from './metrics';
import type { ClearanceSeries, EngineStats, Forecast, ForecastMetric, GaitDay, MetricForecast, SimilarDays } from './types';

const shared = globalThis as typeof globalThis & {
  afoIngest?: [number, number][];
  afoBench?: { at: number; rawMs: number; rollupMs: number; rows: number };
  afoGaitAt?: number;
  afoForecast?: { at: number; value: Forecast };
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

const forecastMetrics: { metric: ForecastMetric; label: string; unit: string; threshold: number | null }[] = [
  { metric: 'clearance', label: 'Toe clearance', unit: 'mm', threshold: 12 },
  { metric: 'eveningClearance', label: 'Evening clearance', unit: 'mm', threshold: 12 },
  { metric: 'dorsi', label: 'Ankle lift', unit: 'deg', threshold: null },
  { metric: 'assist', label: 'Brace assist', unit: '%', threshold: 100 },
  { metric: 'strideCv', label: 'Stride variability', unit: '', threshold: null },
];

async function fitForecast(cutoff: number, today: string) {
  return query<Pick<MetricForecast, 'metric' | 'history' | 'points' | 'slopePerDay' | 'r2' | 'backtest'>>(`
    WITH daily AS (
      SELECT (bucket AT TIME ZONE 'UTC')::date AS day, avg_clearance_mm, avg_peak_dorsi_deg,
        avg_assist_pct, stride_stddev / NULLIF(avg_stride_ms, 0) AS stride_cv
      FROM steps_1d WHERE patient_id=$1 AND steps >= 50
        AND bucket >= (($3::date - 89)::timestamp AT TIME ZONE 'UTC')
        AND bucket < (($3::date + 1)::timestamp AT TIME ZONE 'UTC')
    ), evening AS (
      SELECT (bucket AT TIME ZONE 'UTC')::date AS day,
        sum(avg_clearance_mm * steps) / NULLIF(sum(steps) FILTER (WHERE avg_clearance_mm IS NOT NULL), 0) AS v
      FROM steps_1h WHERE patient_id=$1
        AND bucket >= (($3::date - 89)::timestamp AT TIME ZONE 'UTC')
        AND bucket < (($3::date + 1)::timestamp AT TIME ZONE 'UTC')
        AND extract(hour FROM bucket AT TIME ZONE 'UTC') >= 18
      GROUP BY 1
    ), history AS (
      SELECT d.day, (d.day - DATE '1970-01-01')::float8 AS x, m.metric, m.v
      FROM daily d LEFT JOIN evening e USING (day)
      CROSS JOIN LATERAL (VALUES ('clearance', d.avg_clearance_mm), ('eveningClearance', e.v),
        ('dorsi', d.avg_peak_dorsi_deg), ('assist', d.avg_assist_pct), ('strideCv', d.stride_cv)) m(metric, v)
      WHERE m.v > '-Infinity'::float8 AND m.v < 'Infinity'::float8
    ), windows AS (
      SELECT metric, max(day) - $2::int AS cutoff, count(*) AS days,
        jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'v', v) ORDER BY day) AS history
      FROM history GROUP BY metric
    ), aggregates AS (
      SELECT h.metric, max(h.day) AS last_day, stats_agg(h.v, h.x) AS a
      FROM history h JOIN windows w USING (metric) WHERE h.day <= w.cutoff GROUP BY h.metric
    ), fits AS (
      SELECT metric, last_day, slope(a) AS slope, intercept(a) AS intercept,
        CASE WHEN stddev_y(a, 'pop') = 0 THEN 1 ELSE greatest(0, least(1, determination_coeff(a))) END AS r2,
        num_vals(a)::float8 AS n, average_x(a) AS avg_x, variance_x(a, 'pop') AS var_x,
        stddev_y(a, 'pop') AS stddev_y
      FROM aggregates WHERE num_vals(a) > 2 AND variance_x(a, 'pop') > 0
    ), models AS (
      SELECT *, stddev_y * sqrt(1 - r2) * sqrt(n / (n - 2)) AS sigma FROM fits
    ), targets AS (
      SELECT m.metric, m.last_day + h AS day, NULL::float8 AS actual
      FROM models m CROSS JOIN generate_series(1, 90) h WHERE $2::int = 0
      UNION ALL
      SELECT h.metric, h.day, h.v FROM history h JOIN windows w USING (metric)
      WHERE $2::int > 0 AND w.days >= 45 AND h.day > w.cutoff
    ), predictions AS (
      SELECT t.*, m.intercept + m.slope * (t.day - DATE '1970-01-01') AS p50,
        1.645 * m.sigma * sqrt(1 + 1 / m.n +
          power((t.day - DATE '1970-01-01') - m.avg_x, 2) / (m.n * m.var_x)) AS half
      FROM targets t JOIN models m USING (metric)
    ), results AS (
      SELECT metric, jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'),
        'p10', p50 - half, 'p50', p50, 'p90', p50 + half) ORDER BY day) AS points,
        CASE WHEN count(actual) > 0 THEN jsonb_build_object('mae', avg(abs(actual - p50)),
          'coverage', avg((actual BETWEEN p50 - half AND p50 + half)::int), 'n', count(actual)) END AS backtest
      FROM predictions GROUP BY metric
    )
    SELECT w.metric, w.history, COALESCE(r.points, '[]'::jsonb) AS points,
      COALESCE(m.slope, 0) AS "slopePerDay", COALESCE(m.r2, 0) AS r2, r.backtest
    FROM windows w LEFT JOIN models m USING (metric) LEFT JOIN results r USING (metric)`, [patientId, cutoff, today]);
}

export async function getForecast(): Promise<Forecast> {
  if (shared.afoForecast && Date.now() - shared.afoForecast.at < 300_000) return shared.afoForecast.value;
  const generatedAt = new Date().toISOString();
  const today = generatedAt.slice(0, 10);
  const [fits, backtests, [trips]] = await Promise.all([
    fitForecast(0, today), fitForecast(30, today),
    query<{ nearTrips: Forecast['nearTrips'] }>(`
      WITH counts AS (
        SELECT date_trunc('week', time AT TIME ZONE 'UTC')::date AS week, count(*) AS n
        FROM events WHERE patient_id=$1 AND type='near_trip'
          AND time >= (($2::date - 89)::timestamp AT TIME ZONE 'UTC')
          AND time < (($2::date + 1)::timestamp AT TIME ZONE 'UTC') GROUP BY 1
      ), weeks AS (
        SELECT day::date AS week FROM generate_series(date_trunc('week', ($2::date - 89)::timestamp),
          date_trunc('week', $2::date::timestamp), INTERVAL '1 week') day
      ), series AS (
        SELECT ((w.week - min(w.week) OVER ()) / 7)::float8 AS x, COALESCE(c.n, 0) AS n
        FROM weeks w LEFT JOIN counts c USING (week)
      ), fit AS (
        SELECT stats_agg(ln(n + 0.5)::float8, x) AS a, max(x) AS last_x, sum(n) AS total FROM series
      )
      SELECT CASE WHEN total > 0 THEN jsonb_build_object(
        'perWeekNow', greatest(0, exp(intercept(a) + slope(a) * last_x) - 0.5),
        'perWeekIn90', greatest(0, exp(intercept(a) + slope(a) * (last_x + 13)) - 0.5)) END AS "nearTrips"
      FROM fit`, [patientId, today]),
  ]);
  const metrics: MetricForecast[] = forecastMetrics.map(meta => {
    const fit = fits.find(row => row.metric === meta.metric);
    const points = fit?.points ?? [];
    const past = (v?: number) => v !== undefined && (meta.metric === 'assist' ? v >= meta.threshold! : v <= meta.threshold!);
    const cross = (bound: 'p10' | 'p50' | 'p90') => meta.threshold === null || past(fit?.history.at(-1)?.v) ? null :
      points.find(point => meta.metric === 'assist' ? point[bound] >= meta.threshold! : point[bound] <= meta.threshold!)?.day ?? null;
    return { ...meta, history: fit?.history ?? [], points, slopePerDay: fit?.slopePerDay ?? 0, r2: fit?.r2 ?? 0,
      crossDay: cross('p50'), crossEarliest: cross(meta.metric === 'assist' ? 'p90' : 'p10'),
      crossLatest: cross(meta.metric === 'assist' ? 'p10' : 'p90'),
      backtest: backtests.find(row => row.metric === meta.metric)?.backtest ?? null };
  });
  await query(`INSERT INTO forecasts (made_on, patient_id, metric, day, p10, p50, p90)
    SELECT current_date, $1, p.metric, p.day, p.p10, p.p50, p.p90
    FROM jsonb_to_recordset($2::jsonb) AS p(metric text, day date, p10 float8, p50 float8, p90 float8)
    ON CONFLICT (patient_id, made_on, metric, day) DO UPDATE
      SET p10 = EXCLUDED.p10, p50 = EXCLUDED.p50, p90 = EXCLUDED.p90`,
    [patientId, JSON.stringify(metrics.flatMap(({ metric, points }) => points.map(point => ({ metric, ...point }))))]);
  const value: Forecast = { generatedAt, horizonDays: 90, metrics, nearTrips: trips.nearTrips };
  shared.afoForecast = { at: Date.now(), value };
  return value;
}
