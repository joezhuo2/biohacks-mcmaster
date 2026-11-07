import physionet from '../data/physionet-strides.json';
import { clamp } from './metrics';
import type { Step, Terrain } from './types';

export const { alsStrideCv, controlStrideCv } = physionet;

const zStrides = physionet.als.flatMap(series => {
  const mean = series.reduce((a, b) => a + b, 0) / series.length;
  const sd = Math.sqrt(series.reduce((a, b) => a + (b - mean) ** 2, 0) / series.length);
  return series.map(ms => (ms - mean) / sd);
});
let cursor = -1;

export function syntheticStep(time: Date, terrain: Terrain, decline = 1, random = Math.random): Step {
  const hour = time.getHours();
  const fatigue = hour >= 18 ? 5 : hour >= 12 ? 2.5 : 0;
  const noise = (random() - 0.5) * 3;
  if (cursor < 0) cursor = Math.floor(random() * zStrides.length);
  const z = zStrides[cursor++ % zStrides.length];
  const strideCv = controlStrideCv + (alsStrideCv - controlStrideCv) * (decline + fatigue / 5);
  return {
    time: time.toISOString(), terrain,
    minClearanceMm: Math.max(2, 26 - decline * 6 - fatigue - (terrain === 'level' ? 0 : 2) + noise),
    peakDorsiDeg: 13 - decline * 4 - fatigue * 0.45 + noise * 0.3,
    strideMs: Math.round((1040 + decline * 60) * (1 + z * strideCv)),
    assistPct: Math.round(clamp(25 + decline * 25 + fatigue * 3 + (terrain === 'level' ? 0 : 8), 0, 100)),
  };
}
