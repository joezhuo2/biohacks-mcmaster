import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { db, patientId } from '../lib/db';
import { syntheticStep } from '../lib/synthetic';
import type { Audience, CareEvent, Step, Terrain } from '../lib/types';

let state = 20261107;
function random() {
  state = (Math.imul(1664525, state) + 1013904223) >>> 0;
  return state / 4294967296;
}

async function main() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 89);
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('afo-seed'))");
    const existing = await client.query('SELECT 1 FROM steps WHERE patient_id=$1 LIMIT 1', [patientId]);
    if (existing.rowCount) throw new Error('Patient already has steps. Seed requires an empty patient history.');
    for (let day = 0; day < 90; day++) {
      const date = new Date(start);
      date.setDate(date.getDate() + day);
      const steps: Step[] = [];
      const events: CareEvent[] = [];
      const addEvent = (time: Date, type: CareEvent['type'], message: string, terrain: Terrain = 'level', severity: 1 | 2 | 3 = 1) => {
        if (time <= now) events.push({ id: randomUUID(), time: time.toISOString(), type, severity, message, terrain });
      };
      const on = new Date(date);
      on.setHours(7);
      addEvent(on, 'afo_on', 'Brace put on');
      for (let hour = 7; hour <= 21; hour++) {
        const count = Math.round(145 - day * 0.4 + random() * 65);
        let previousAssist = 0;
        for (let i = 0; i < count; i++) {
          const time = new Date(date);
          time.setHours(hour, 5 + Math.floor(i / 35) * 10, 0, Math.round((i % 35) * 1100));
          if (time > now) continue;
          const terrain: Terrain = i < 14 ? (hour % 2 ? 'stairs_up' : 'stairs_down') : 'level';
          const step = syntheticStep(time, terrain, day / 89, random);
          steps.push(step);
          if (i === 0) addEvent(time, 'stairs_start', 'Stair bout started', terrain);
          if (i === 14) addEvent(time, 'stairs_end', 'Stair bout finished');
          if (previousAssist && Math.abs(step.assistPct - previousAssist) >= 5) {
            addEvent(time, step.assistPct > previousAssist ? 'assist_increase' : 'assist_decrease', `Assist adjusted to ${step.assistPct}%`, terrain);
          }
          previousAssist = step.assistPct;
          if (terrain !== 'level' && random() < (hour >= 18 ? 0.004 + day / 89 * 0.007 : 0.0005)) {
            addEvent(time, 'near_trip', 'Possible near-trip on stairs', terrain, 2);
          }
        }
      }
      if (day === 28 || day === 71) {
        const fall = new Date(date);
        fall.setHours(19, 5, 7);
        addEvent(fall, 'fall', 'Reported fall during evening stair use', 'stairs_down', 3);
      }
      const off = new Date(date);
      off.setHours(22);
      addEvent(off, 'afo_off', 'Brace taken off');
      await client.query(`INSERT INTO steps SELECT x.time,$1,x.terrain,x."minClearanceMm",x."peakDorsiDeg",x."strideMs",x."assistPct"
        FROM jsonb_to_recordset($2::jsonb) AS x(time timestamptz,terrain text,"minClearanceMm" float8,"peakDorsiDeg" float8,"strideMs" float8,"assistPct" float8)`,
      [patientId, JSON.stringify(steps)]);
      await client.query(`INSERT INTO events SELECT x.id,x.time,$1,x.type,x.severity,x.message,x.terrain
        FROM jsonb_to_recordset($2::jsonb) AS x(id uuid,time timestamptz,type text,severity int,message text,terrain text)`, [patientId, JSON.stringify(events)]);
    }
    for (let visit = 0; visit < 3; visit++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - (2 - visit) * 3);
      await client.query(`INSERT INTO clinic_scores (id,patient_id,date,alsfrs_r,walk_10m_sec,note) VALUES ($1,$2,$3,$4,$5,$6)`,
        [randomUUID(), patientId, date.toLocaleDateString('en-CA'), 36 - visit * 2, [11.8, 13.0, 14.2][visit], 'Synthetic quarterly clinic visit. 10 m walk with a cane.']);
    }
    const placeholders: Record<Audience, string> = {
      family: `## How Alex did this week
This is a demo summary using synthetic history. Alex's foot clearance is lower later in the day, and the brace provides more help.

## Stairs
The demo includes possible near-trips on stairs, especially in the evening. Check in with Alex about how stairs are feeling.

## What to watch for
Notice whether fatigue makes familiar activities harder, and share changes with his care team.

## How you can help
Support the home exercises already agreed with Daniela Ferreira and ask her to review any changes. Help Alex plan breaks around activities that matter to him.

The adaptive AFO is a prototype, not a proven ALS treatment. Demo placeholder, not a Gemini-generated report. AI-generated summary, not medical advice.`,
      physician: `## Stability findings
Synthetic history illustrates lower clearance in afternoons and after 6 PM, with increased assist and stair near-trips.

## Progression vs baseline
The demo trends show decreasing clearance and peak dorsiflexion against the first 14 days, with rising assist. The latest synthetic 10 m walk is 14.2 s. Sensor trends alone do not establish disease progression.

## Suggested physiotherapy focus
Suggestions for Daniela Ferreira, the treating physiotherapist, to review: ankle dorsiflexor work, stair strategy, fatigue pacing, and prototype AFO assist tuning. These are not prescriptions.

## Questions for the next visit
How do evening fatigue and stair confidence compare with earlier visits? Does the current home exercise plan remain appropriate? Is assist comfortable?

The adaptive AFO is a prototype, not a proven ALS treatment. Demo placeholder, not a Gemini-generated report. AI-generated summary, not medical advice.`,
    };
    for (const audience of ['family', 'physician'] as const) {
      const from = audience === 'family' ? new Date(now.getTime() - 7 * 86400000) : start;
      await client.query('INSERT INTO reports (id,patient_id,audience,range_start,range_end,markdown) VALUES ($1,$2,$3,$4,$5,$6)',
        [randomUUID(), patientId, audience, from.toISOString(), now.toISOString(), placeholders[audience]]);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  await db().query("CALL refresh_continuous_aggregate('steps_1h', NULL, NULL)");
  await db().query("CALL refresh_continuous_aggregate('steps_1d', NULL, NULL)");
  console.log('Seeded 90 days, three clinic visits, and two placeholder reports.');
}

void main().finally(() => db().end());
