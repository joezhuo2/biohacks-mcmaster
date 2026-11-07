CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS samples (
  time timestamptz NOT NULL, patient_id text NOT NULL,
  ankle_deg double precision NOT NULL, assist_pct double precision NOT NULL CHECK (assist_pct BETWEEN 0 AND 100)
);
SELECT create_hypertable('samples', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS samples_patient_time ON samples (patient_id, time DESC);
ALTER TABLE samples SET (timescaledb.compress, timescaledb.compress_segmentby = 'patient_id');
SELECT add_compression_policy('samples', INTERVAL '3 days', if_not_exists => TRUE);
SELECT add_retention_policy('samples', INTERVAL '30 days', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS steps (
  time timestamptz NOT NULL, patient_id text NOT NULL,
  terrain text NOT NULL CHECK (terrain IN ('level', 'stairs_up', 'stairs_down')),
  min_clearance_mm double precision NOT NULL CHECK (min_clearance_mm >= 0),
  peak_dorsi_deg double precision NOT NULL,
  stride_ms double precision NOT NULL CHECK (stride_ms > 0),
  assist_pct double precision NOT NULL CHECK (assist_pct BETWEEN 0 AND 100)
);
SELECT create_hypertable('steps', 'time', if_not_exists => TRUE);
CREATE INDEX IF NOT EXISTS steps_patient_time ON steps (patient_id, time DESC);
ALTER TABLE steps SET (timescaledb.compress, timescaledb.compress_segmentby = 'patient_id');
SELECT add_compression_policy('steps', INTERVAL '7 days', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY, time timestamptz NOT NULL, patient_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('near_trip','fall','assist_increase','assist_decrease','stairs_start','stairs_end','afo_on','afo_off')),
  severity integer NOT NULL CHECK (severity BETWEEN 1 AND 3), message text NOT NULL,
  terrain text CHECK (terrain IN ('level','stairs_up','stairs_down'))
);
CREATE INDEX IF NOT EXISTS events_patient_time ON events (patient_id, time DESC);
CREATE TABLE IF NOT EXISTS clinic_scores (
  id uuid PRIMARY KEY, patient_id text NOT NULL, date date NOT NULL,
  alsfrs_r integer CHECK (alsfrs_r BETWEEN 0 AND 48),
  walk_10m_sec double precision CHECK (walk_10m_sec > 0), note text
);
CREATE INDEX IF NOT EXISTS clinic_patient_date ON clinic_scores (patient_id, date);
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY, patient_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  audience text NOT NULL CHECK (audience IN ('family','physician')),
  range_start timestamptz NOT NULL, range_end timestamptz NOT NULL, markdown text NOT NULL,
  CHECK (range_end > range_start)
);
CREATE INDEX IF NOT EXISTS reports_patient_created ON reports (patient_id, created_at DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS steps_1h
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket(INTERVAL '1 hour', time) AS bucket, patient_id,
  count(*) AS steps, count(*) FILTER (WHERE terrain = 'level') AS level_steps,
  count(*) FILTER (WHERE terrain = 'stairs_up') AS stairs_up,
  count(*) FILTER (WHERE terrain = 'stairs_down') AS stairs_down,
  avg(min_clearance_mm) AS avg_clearance_mm, avg(peak_dorsi_deg) AS avg_peak_dorsi_deg,
  avg(assist_pct) AS avg_assist_pct, avg(stride_ms) AS avg_stride_ms,
  stddev_pop(stride_ms) AS stride_stddev
FROM steps GROUP BY bucket, patient_id WITH NO DATA;
CREATE MATERIALIZED VIEW IF NOT EXISTS steps_1d
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT time_bucket(INTERVAL '1 day', time) AS bucket, patient_id,
  count(*) AS steps, count(*) FILTER (WHERE terrain = 'level') AS level_steps,
  count(*) FILTER (WHERE terrain = 'stairs_up') AS stairs_up,
  count(*) FILTER (WHERE terrain = 'stairs_down') AS stairs_down,
  avg(min_clearance_mm) AS avg_clearance_mm, avg(peak_dorsi_deg) AS avg_peak_dorsi_deg,
  avg(assist_pct) AS avg_assist_pct, avg(stride_ms) AS avg_stride_ms,
  stddev_pop(stride_ms) AS stride_stddev
FROM steps GROUP BY bucket, patient_id WITH NO DATA;
SELECT add_continuous_aggregate_policy('steps_1h', start_offset => INTERVAL '7 days', end_offset => INTERVAL '1 hour', schedule_interval => INTERVAL '15 minutes', if_not_exists => TRUE);
SELECT add_continuous_aggregate_policy('steps_1d', start_offset => INTERVAL '7 days', end_offset => INTERVAL '1 day', schedule_interval => INTERVAL '1 hour', if_not_exists => TRUE);
