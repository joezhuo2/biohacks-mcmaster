import { patientId, query } from './db';
import { stabilityScore } from './metrics';
import type { Audience, CareEvent, ClinicScore, DailyMetrics, HourCell, Report, Status, Step } from './types';

export async function getStatus(): Promise<Status> {
  const [row] = await query<Status>(`WITH latest AS (
      (SELECT time, assist_pct FROM samples WHERE patient_id=$1 ORDER BY time DESC LIMIT 1)
      UNION ALL (SELECT time, assist_pct FROM steps WHERE patient_id=$1 ORDER BY time DESC LIMIT 1)
    ), wear AS (SELECT type FROM events WHERE patient_id=$1 AND type IN ('afo_on','afo_off') ORDER BY time DESC LIMIT 1),
    terrain AS (
      (SELECT time, terrain FROM steps WHERE patient_id=$1 ORDER BY time DESC LIMIT 1)
      UNION ALL (SELECT time, CASE WHEN type='stairs_end' THEN 'level' ELSE terrain END FROM events
        WHERE patient_id=$1 AND (terrain IS NOT NULL OR type='stairs_end') ORDER BY time DESC LIMIT 1)
    ) SELECT COALESCE((SELECT type='afo_on' FROM wear), EXISTS(SELECT 1 FROM latest)) AS wearing,
      COALESCE((SELECT terrain FROM terrain ORDER BY time DESC LIMIT 1),'level') AS terrain,
      COALESCE((SELECT assist_pct FROM latest ORDER BY time DESC LIMIT 1),0) AS "assistPct",
      (SELECT max(time) FROM (SELECT time FROM latest UNION ALL
        (SELECT time FROM events WHERE patient_id=$1 ORDER BY time DESC LIMIT 1)) seen) AS "lastSeen"`, [patientId]);
  return row;
}

export function getSteps(from: string, to: string) {
  return query<Step>(`SELECT time, terrain, min_clearance_mm AS "minClearanceMm", peak_dorsi_deg AS "peakDorsiDeg",
    stride_ms AS "strideMs", assist_pct AS "assistPct" FROM steps
    WHERE patient_id=$1 AND time >= $2 AND time < $3 ORDER BY time`, [patientId, from, to]);
}

export function getEvents(from: string, to: string, type?: string) {
  return query<CareEvent>(`SELECT id, time, type, severity, message, terrain FROM events
    WHERE patient_id=$1 AND time >= $2 AND time < $3 AND ($4::text IS NULL OR type=$4) ORDER BY time DESC`, [patientId, from, to, type ?? null])
    .then(rows => rows.map(row => row.terrain ? row : Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'terrain')) as unknown as CareEvent));
}

export function getClinicScores() {
  return query<ClinicScore>(`SELECT id, to_char(date,'YYYY-MM-DD') AS date, alsfrs_r AS "alsfrsR", walk_10m_sec AS "walk10mSec", note
    FROM clinic_scores WHERE patient_id=$1 ORDER BY date`, [patientId]).then(rows => rows.map(row =>
      Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null)) as unknown as ClinicScore));
}

export async function addClinicScore(score: Omit<ClinicScore, 'id'>): Promise<ClinicScore> {
  const id = crypto.randomUUID();
  await query(`INSERT INTO clinic_scores (id, patient_id, date, alsfrs_r, walk_10m_sec, note) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, patientId, score.date, score.alsfrsR ?? null, score.walk10mSec ?? null, score.note ?? null]);
  return { id, ...score };
}

export const reportColumns = 'id, created_at AS "createdAt", audience, range_start AS "rangeStart", range_end AS "rangeEnd", markdown';
export function getReports(audience?: Audience) {
  return query<Report>(`SELECT ${reportColumns} FROM reports WHERE patient_id=$1 AND ($2::text IS NULL OR audience=$2) ORDER BY created_at DESC`, [patientId, audience ?? null]);
}

export async function getBaseline() {
  const [baseline] = await query<{ from: string | null; to: string | null; avgPeakDorsiDeg: number; avgClearanceMm: number; avgAssistPct: number }>(`
    WITH first AS (SELECT min(time) AS start FROM steps WHERE patient_id=$1)
    SELECT min(time) AS "from", max(time) AS "to", COALESCE(avg(peak_dorsi_deg),10) AS "avgPeakDorsiDeg",
      COALESCE(avg(min_clearance_mm),0) AS "avgClearanceMm", COALESCE(avg(assist_pct),0) AS "avgAssistPct"
    FROM steps, first WHERE patient_id=$1 AND time < first.start + INTERVAL '14 days'`, [patientId]);
  return baseline;
}

export async function getDaily(from: string, to: string): Promise<DailyMetrics[]> {
  const [rows, baseline] = await Promise.all([
    query<DailyMetrics & { strideMean: number; strideStddev: number; stairNearTrips: number }>(`
      WITH gait AS (SELECT bucket, steps::int, (stairs_up + stairs_down)::int AS stair_steps,
        avg_clearance_mm AS clearance, avg_peak_dorsi_deg AS dorsi, avg_assist_pct AS assist,
        avg_stride_ms AS stride_mean, stride_stddev
        FROM steps_1d WHERE patient_id=$1 AND bucket >= $2 AND bucket < $3),
      incidents AS (SELECT time_bucket('1 day',time) AS bucket,
        count(*) FILTER (WHERE type='near_trip')::int AS near_trips,
        count(*) FILTER (WHERE type='fall')::int AS falls,
        count(*) FILTER (WHERE type='near_trip' AND terrain <> 'level')::int AS stair_near_trips
        FROM events WHERE patient_id=$1 AND time >= $2 AND time < $3 GROUP BY bucket)
      SELECT to_char(COALESCE(g.bucket,e.bucket) AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,
        COALESCE(steps,0) AS steps, COALESCE(stair_steps,0) AS "stairSteps",
        COALESCE(clearance,0) AS "avgClearanceMm", COALESCE(dorsi,0) AS "avgPeakDorsiDeg",
        COALESCE(assist,0) AS "avgAssistPct", COALESCE(near_trips,0) AS "nearTrips", COALESCE(falls,0) AS falls,
        COALESCE(stride_mean,0) AS "strideMean", COALESCE(stride_stddev,0) AS "strideStddev", COALESCE(stair_near_trips,0) AS "stairNearTrips"
      FROM gait g FULL JOIN incidents e USING (bucket) ORDER BY day`, [patientId, from, to]), getBaseline(),
  ]);
  return rows.map(({ strideMean, strideStddev, stairNearTrips, ...row }) => ({ ...row,
    stabilityScore: row.steps ? stabilityScore({ clearance: row.avgClearanceMm, dorsi: row.avgPeakDorsiDeg,
      baselineDorsi: baseline.avgPeakDorsiDeg, strideMean, strideStddev, stairSteps: row.stairSteps, stairNearTrips, assist: row.avgAssistPct }) : 0,
  }));
}

export function getHourly(from: string, to: string): Promise<HourCell[]> {
  return query<HourCell>(`WITH gait AS (
      SELECT time_bucket('1 hour',time) AS bucket, avg(min_clearance_mm) AS clearance
      FROM steps WHERE patient_id=$1 AND time >= $2 AND time < $3 GROUP BY bucket
    ), incidents AS (
      SELECT time_bucket('1 hour',time) AS bucket, count(*)::int AS near_trips
      FROM events WHERE patient_id=$1 AND time >= $2 AND time < $3 AND type='near_trip' GROUP BY bucket
    ) SELECT to_char(COALESCE(g.bucket,e.bucket) AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,
      extract(hour FROM COALESCE(g.bucket,e.bucket) AT TIME ZONE 'UTC')::int AS hour,
      COALESCE(clearance,0) AS "avgClearanceMm", COALESCE(near_trips,0) AS "nearTrips"
    FROM gait g FULL JOIN incidents e USING (bucket) ORDER BY day,hour`, [patientId, from, to]);
}

export function getAnomalies(from: string, to: string) {
  return query<{ day: string; hour: number; avgClearanceMm: number; thresholdMm: number }>(`
    WITH hourly AS (SELECT time_bucket('1 hour',time) AS bucket, avg(min_clearance_mm) AS clearance
      FROM steps WHERE patient_id=$1 AND time >= $2::timestamptz - INTERVAL '30 days' AND time < $3 GROUP BY bucket),
    bounds AS (SELECT avg(clearance) - 2 * stddev_pop(clearance) AS threshold FROM hourly
      WHERE bucket >= $3::timestamptz - INTERVAL '30 days')
    SELECT to_char(bucket AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,
      extract(hour FROM bucket AT TIME ZONE 'UTC')::int AS hour, clearance AS "avgClearanceMm", threshold AS "thresholdMm"
    FROM hourly,bounds WHERE bucket >= $2 AND clearance < threshold ORDER BY bucket`, [patientId, from, to]);
}

export function getStairNearTrips(from: string, to: string) {
  return query<{ day: string; hour: number; terrain: string; nearTrips: number; maxSeverity: number }>(`
    SELECT to_char(time AT TIME ZONE 'UTC','YYYY-MM-DD') AS day,
      extract(hour FROM time AT TIME ZONE 'UTC')::int AS hour, terrain, count(*)::int AS "nearTrips", max(severity) AS "maxSeverity"
    FROM events WHERE patient_id=$1 AND time >= $2 AND time < $3 AND type='near_trip' AND terrain <> 'level'
    GROUP BY day,hour,terrain ORDER BY day,hour`, [patientId, from, to]);
}
