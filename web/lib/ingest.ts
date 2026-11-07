import { randomUUID } from 'node:crypto';
import { db, patientId } from './db';
import { live, publish, publishSamples } from './bus';
import { choice, HttpError, number, object, text, timestamp } from './http';
import { getStatus } from './data';
import type { CareEvent, IngestBody, Sample, Step } from './types';

export const terrains = ['level', 'stairs_up', 'stairs_down'] as const;
export const eventTypes = ['near_trip', 'fall', 'assist_increase', 'assist_decrease', 'stairs_start', 'stairs_end', 'afo_on', 'afo_off'] as const;

function list(value: unknown, name: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new HttpError(400, `Invalid ${name} array (maximum ${max})`);
  return value;
}

export function parseIngest(input: Record<string, unknown>): IngestBody {
  const samples: Sample[] = list(input.samples, 'samples', 10000).map(value => {
    const row = object(value);
    return { time: timestamp(row.time), ankleDeg: number(row.ankleDeg, 'ankleDeg', -180, 180), assistPct: number(row.assistPct, 'assistPct', 0, 100) };
  });
  const steps: Step[] = list(input.steps ?? [], 'steps', 1000).map(value => {
    const row = object(value);
    return {
      time: timestamp(row.time), terrain: choice(row.terrain, terrains, 'terrain'),
      minClearanceMm: number(row.minClearanceMm, 'minClearanceMm', 0, 1000),
      peakDorsiDeg: number(row.peakDorsiDeg, 'peakDorsiDeg', -180, 180),
      strideMs: number(row.strideMs, 'strideMs', 1, 60000), assistPct: number(row.assistPct, 'assistPct', 0, 100),
    };
  });
  const events: Omit<CareEvent, 'id'>[] = list(input.events ?? [], 'events', 1000).map(value => {
    const row = object(value);
    const severity = number(row.severity, 'severity', 1, 3);
    if (!Number.isInteger(severity)) throw new HttpError(400, 'severity must be 1, 2 or 3');
    return {
      time: timestamp(row.time), type: choice(row.type, eventTypes, 'type'), severity: severity as 1 | 2 | 3,
      message: text(row.message, 'message'),
      ...(row.terrain === undefined ? {} : { terrain: choice(row.terrain, terrains, 'terrain') }),
    };
  });
  return { samples, steps, events };
}

export async function ingest(input: IngestBody) {
  const events = (input.events ?? []).map(event => ({ ...event, id: randomUUID() }));
  const steps = input.steps ?? [];
  publishSamples(input.samples);
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    await client.query(`INSERT INTO samples SELECT x.time, $1, x."ankleDeg", x."assistPct"
      FROM jsonb_to_recordset($2::jsonb) AS x(time timestamptz, "ankleDeg" float8, "assistPct" float8)`, [patientId, JSON.stringify(input.samples)]);
    await client.query(`INSERT INTO steps SELECT x.time, $1, x.terrain, x."minClearanceMm", x."peakDorsiDeg", x."strideMs", x."assistPct"
      FROM jsonb_to_recordset($2::jsonb) AS x(time timestamptz, terrain text, "minClearanceMm" float8, "peakDorsiDeg" float8, "strideMs" float8, "assistPct" float8)`, [patientId, JSON.stringify(steps)]);
    await client.query(`INSERT INTO events SELECT x.id, x.time, $1, x.type, x.severity, x.message, x.terrain
      FROM jsonb_to_recordset($2::jsonb) AS x(id uuid, time timestamptz, type text, severity int, message text, terrain text)`, [patientId, JSON.stringify(events)]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  for (const step of steps) publish({ kind: 'step', data: step });
  for (const event of events) publish({ kind: 'event', data: event });
  live.status = await getStatus();
  publish({ kind: 'status', data: live.status });
  return { samples: input.samples.length, steps: steps.length, events: events.length };
}
