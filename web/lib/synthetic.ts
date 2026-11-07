import { clamp } from './metrics';
import type { Step, Terrain } from './types';

export function syntheticStep(time: Date, terrain: Terrain, decline = 1, random = Math.random): Step {
  const hour = time.getHours();
  const fatigue = hour >= 18 ? 5 : hour >= 12 ? 2.5 : 0;
  const noise = (random() - 0.5) * 3;
  return {
    time: time.toISOString(), terrain,
    minClearanceMm: Math.max(2, 26 - decline * 6 - fatigue - (terrain === 'level' ? 0 : 2) + noise),
    peakDorsiDeg: 13 - decline * 4 - fatigue * 0.45 + noise * 0.3,
    strideMs: Math.round(1040 + decline * 60 + (random() - 0.5) * (70 + decline * 170 + fatigue * 25)),
    assistPct: Math.round(clamp(25 + decline * 25 + fatigue * 3 + (terrain === 'level' ? 0 : 8), 0, 100)),
  };
}
