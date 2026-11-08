"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFetch } from "@/hooks/useFetch";
import { paths } from "@/lib/api";
import type { ClearanceSeries, ClinicScore, DailyMetrics } from "@/lib/types";
import { Card, Empty, Skeleton } from "../Card";
import { axis, tooltip, useChartAnimation } from "../charts";
import { dayMs, fmtDay } from "../format";
import { ClinicScores } from "./ClinicScores";

type Point = { t: number; stability: number; clearance: number; dorsi: number; assist: number };
type Band = { t: number; band: [number, number]; median: number };
type Trace = { t: number; v: number };

const series: { key: keyof Omit<Point, "t">; label: string; unit: string; digits: number }[] = [
  { key: "stability", label: "Stability score", unit: "", digits: 0 },
  { key: "clearance", label: "Toe clearance", unit: " cm", digits: 2 },
  { key: "dorsi", label: "Peak dorsiflexion", unit: "°", digits: 1 },
  { key: "assist", label: "Assist", unit: "%", digits: 0 },
];

function Trend({
  data,
  s,
  visits,
  domain,
  clearance,
}: {
  data: Point[];
  s: (typeof series)[number];
  visits: number[];
  domain: [number, number];
  clearance?: { band: Band[]; trace: Trace[] };
}) {
  const animate = useChartAnimation();
  const banded = s.key === "clearance" && !!clearance?.band.length;
  const last = banded ? clearance!.band.at(-1)!.median : data.at(-1)?.[s.key];
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-muted">
          {s.label}
          {banded && <span className="text-faint"> · p10–p90 band, hourly LTTB trace</span>}
        </span>
        {last !== undefined && (
          <span className="font-medium tabular">
            {last.toFixed(s.digits)}
            {s.unit}
          </span>
        )}
      </div>
      <div className="mt-1 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="var(--line)" />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={domain}
              tickFormatter={(t: number) => fmtDay(t)}
              minTickGap={40}
              {...axis}
            />
            <YAxis domain={["auto", "auto"]} tickCount={3} width={44} tickFormatter={(v: number) => v.toFixed(Math.min(1, s.digits))} {...axis} />
            {!banded && (
              <Tooltip
                {...tooltip}
                labelFormatter={(t) => fmtDay(Number(t))}
                formatter={(v) => [`${Number(v).toFixed(s.digits)}${s.unit}`, s.label]}
              />
            )}
            {visits.map((v) => (
              <ReferenceLine key={v} x={v} stroke="var(--accent)" strokeDasharray="3 3" strokeOpacity={0.7} />
            ))}
            {banded && (
              <>
                <Area
                  data={clearance!.band}
                  dataKey="band"
                  stroke="none"
                  fill="var(--accent)"
                  fillOpacity={0.14}
                  isAnimationActive={false}
                />
                <Line
                  data={clearance!.trace}
                  dataKey="v"
                  stroke="var(--fg)"
                  strokeOpacity={0.2}
                  strokeWidth={1}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </>
            )}
            <Line
              {...(banded ? { data: clearance!.band } : {})}
              dataKey={banded ? "median" : s.key}
              type="monotone"
              stroke="var(--fg)"
              strokeOpacity={0.8}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
              isAnimationActive={animate}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ProgressionCard({
  daily,
  loading,
  scores,
  scoresLoading,
  onAdded,
}: {
  daily?: DailyMetrics[];
  loading: boolean;
  scores?: ClinicScore[];
  scoresLoading: boolean;
  onAdded: (s: ClinicScore) => void;
}) {
  const data = useMemo<Point[]>(
    () =>
      (daily ?? [])
        .filter((d) => d.steps > 0)
        .map((d) => ({
          t: dayMs(d.day),
          stability: d.stabilityScore,
          clearance: d.avgClearanceMm / 10,
          dorsi: d.avgPeakDorsiDeg,
          assist: d.avgAssistPct,
        }))
        .sort((a, b) => a.t - b.t)
        .slice(-90),
    [daily],
  );
  const raw = useFetch<ClearanceSeries>(paths.clearance(90));
  const clearance = useMemo(
    () =>
      raw.data && {
        band: raw.data.band.map((b) => ({ t: dayMs(b.day), band: [b.p10 / 10, b.p90 / 10] as [number, number], median: b.p50 / 10 })),
        trace: raw.data.trace.map((p) => ({ t: Date.parse(p.t), v: p.v / 10 })),
      },
    [raw.data],
  );
  const domain: [number, number] = data.length ? [data[0].t, data[data.length - 1].t] : [0, 1];
  const visits = (scores ?? []).map((s) => dayMs(s.date)).filter((t) => t >= domain[0] && t <= domain[1]);

  return (
    <Card
      title="Progression, 90 days"
      action={
        <span className="flex items-center gap-1.5 text-[13px] text-muted">
          <span className="h-3 w-0 border-l border-dashed border-accent" />
          Clinic visit
        </span>
      }
    >
      {loading && !daily ? (
        <Skeleton className="h-64" />
      ) : data.length ? (
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          {series.map((s) => (
            <Trend key={s.key} data={data} s={s} visits={visits} domain={domain} clearance={clearance} />
          ))}
        </div>
      ) : (
        <Empty>No history yet. Trends appear once daily metrics are available.</Empty>
      )}
      <ClinicScores scores={scores} loading={scoresLoading} onAdded={onAdded} />
    </Card>
  );
}
