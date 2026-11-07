import type { DailyMetrics } from "@/lib/types";
import { DAY } from "@/hooks/useNow";
import { localDayKey } from "../format";

export type Range = 7 | 30 | 90;

export interface Summary {
  stability: number;
  clearanceCm: number;
  dorsiDeg: number;
  assistPct: number;
  tripsPer100: number | null;
}

export function windowOf(daily: DailyMetrics[], today: number, range: Range, offset = 0) {
  const from = localDayKey(today - (range * (offset + 1) - 1) * DAY);
  const to = localDayKey(today - range * offset * DAY);
  return daily.filter((d) => {
    const k = d.day.slice(0, 10);
    return k >= from && k <= to && d.steps > 0;
  });
}

export function summarize(days: DailyMetrics[]): Summary | null {
  if (!days.length) return null;
  const steps = days.reduce((a, d) => a + d.steps, 0);
  const stairs = days.reduce((a, d) => a + d.stairSteps, 0);
  const weighted = (f: (d: DailyMetrics) => number) => days.reduce((a, d) => a + f(d) * d.steps, 0) / steps;
  return {
    stability: days.reduce((a, d) => a + d.stabilityScore, 0) / days.length,
    clearanceCm: weighted((d) => d.avgClearanceMm) / 10,
    dorsiDeg: weighted((d) => d.avgPeakDorsiDeg),
    assistPct: weighted((d) => d.avgAssistPct),
    tripsPer100: stairs ? (days.reduce((a, d) => a + d.nearTrips, 0) / stairs) * 100 : null,
  };
}
