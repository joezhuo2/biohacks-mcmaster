import 'dotenv/config';
import { syntheticStep } from '../lib/synthetic';
import type { CareEvent, IngestBody, Sample, Terrain } from '../lib/types';

const url = `http://localhost:${process.env.PORT ?? 3000}/api/ingest`;
let terrain: Terrain = 'level';
let stairEnd = 0;
let nextStairs = Date.now() + 30000;
let nextStep = Date.now();
let sampleTime = Date.now();
let assist = 50;
let running = true;
const events: Omit<CareEvent, 'id'>[] = [];

function event(type: CareEvent['type'], message: string, severity: 1 | 2 | 3 = 1) {
  events.push({ time: new Date().toISOString(), type, severity, message, terrain });
}

function stairs() {
  if (terrain === 'level') {
    terrain = Math.random() < 0.5 ? 'stairs_up' : 'stairs_down';
    stairEnd = Date.now() + 16000;
    event('stairs_start', 'Stair bout started');
  } else {
    event('stairs_end', 'Stair bout finished');
    terrain = 'level';
    nextStairs = Date.now() + 45000;
  }
}

async function post(payload: IngestBody) {
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-source': 'sim' }, body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Ingest failed (${response.status}): ${await response.text()}`);
}

async function main() {
  event('afo_on', 'Prototype AFO connected');
  console.log(`Simulating at ${url}. Press n for a stair near-trip, s for stairs, q to stop.`);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (buffer: Buffer) => {
      for (const key of buffer.toString()) {
        if (key === 'n') {
          if (terrain === 'level') stairs();
          event('near_trip', 'Possible near-trip on the stairs', 2);
        }
        if (key === 's') stairs();
        if (key === 'q' || key === '\u0003') running = false;
      }
    });
  }
  process.on('SIGINT', () => { running = false; });
  process.on('SIGTERM', () => { running = false; });
  while (running) {
    const now = Date.now();
    if (terrain === 'level' ? now >= nextStairs : now >= stairEnd) stairs();
    const samples: Sample[] = [];
    const steps = [];
    while (sampleTime <= now) {
      const phase = (sampleTime % 1100) / 1100 * 2 * Math.PI;
      samples.push({ time: new Date(sampleTime).toISOString(), ankleDeg: 3 + 11 * Math.sin(phase) + 2 * Math.sin(phase * 2), assistPct: assist });
      sampleTime += 10;
    }
    if (now >= nextStep) {
      const step = syntheticStep(new Date(now), terrain);
      if (Math.abs(step.assistPct - assist) >= 5) event(step.assistPct > assist ? 'assist_increase' : 'assist_decrease', `Assist adjusted to ${step.assistPct}%`);
      assist = step.assistPct;
      steps.push(step);
      nextStep = now + step.strideMs;
      if (terrain !== 'level' && Math.random() < 0.008) event('near_trip', 'Possible near-trip on the stairs', 2);
    }
    await post({ samples, steps, events: events.splice(0) });
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 250 - (Date.now() - now))));
  }
  event('afo_off', 'Prototype AFO disconnected');
  await post({ samples: [], events });
}

void main().finally(() => {
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.pause();
});
