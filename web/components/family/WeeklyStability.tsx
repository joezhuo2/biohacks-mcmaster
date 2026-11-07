"use client";

import type { DailyMetrics } from "@/lib/types";
import { Card, Empty, Skeleton } from "../Card";
import { Sparkline } from "../charts";

function meaning(diff: number | null) {
  if (diff === null) return "Higher means steadier walking.";
  if (diff >= 3) return "A little steadier than last week. Higher means steadier walking.";
  if (diff <= -3) return "A little less steady than last week. Rest and pacing can help.";
  return "About the same as last week. Higher means steadier walking.";
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

export function WeeklyStability({ daily, loading }: { daily?: DailyMetrics[]; loading: boolean }) {
  if (loading && !daily) {
    return (
      <Card title="Stability this week">
        <Skeleton className="h-28" />
      </Card>
    );
  }
  const days = [...(daily ?? [])].filter((d) => d.steps > 0).sort((a, b) => a.day.localeCompare(b.day));
  const week = days.slice(-7);
  if (!week.length) {
    return (
      <Card title="Stability this week">
        <Empty>Stability appears after a day of walking with the brace.</Empty>
      </Card>
    );
  }
  const prev = days.slice(-14, -7);
  const score = Math.round(mean(week.map((d) => d.stabilityScore)));
  const diff = prev.length ? score - mean(prev.map((d) => d.stabilityScore)) : null;

  return (
    <Card title="Stability this week">
      <div className="flex items-end gap-6">
        <div className="shrink-0">
          <span className="text-[3.5rem] font-semibold leading-none tracking-display tabular">{score}</span>
          <span className="ml-1 text-sm text-muted">/ 100</span>
        </div>
        <div className="min-w-0 flex-1">
          <Sparkline data={week} dataKey="stabilityScore" height={64} />
        </div>
      </div>
      <p className="mt-4 text-[15px] text-muted">{meaning(diff)}</p>
    </Card>
  );
}
