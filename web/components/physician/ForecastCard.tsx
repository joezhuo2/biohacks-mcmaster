"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useFetch } from "@/hooks/useFetch";
import { useToday } from "@/hooks/useNow";
import { paths } from "@/lib/api";
import type { Forecast, MetricForecast } from "@/lib/types";
import { Card, Empty, Skeleton } from "../Card";
import { axis, tooltip, useChartAnimation } from "../charts";
import { dayMs, fmtDay } from "../format";

type Point = { t: number; v?: number; p50?: number; band?: [number, number] };

function Trend({ metric, today }: { metric: MetricForecast; today: number | null }) {
  const animate = useChartAnimation();
  const data = useMemo(() => {
    const byDay = new Map<number, Point>();
    for (const p of metric.history) {
      const t = dayMs(p.day);
      byDay.set(t, { t, v: p.v });
    }
    const last = [...byDay.values()].sort((a, b) => a.t - b.t).at(-1);
    if (last) last.p50 = last.v;
    for (const p of metric.points) {
      const t = dayMs(p.day);
      byDay.set(t, { ...byDay.get(t), t, p50: p.p50, band: [p.p10, p.p90] });
    }
    return [...byDay.values()].sort((a, b) => a.t - b.t);
  }, [metric]);
  const domain: [number, number] = data.length ? [data[0].t, data[data.length - 1].t] : [0, 1];
  const last = data.findLast((p) => p.band)?.p50;
  const digits = metric.metric === "strideCv" ? 3 : 1;
  const unit = metric.metric === "clearance" || metric.metric === "eveningClearance" ? " mm" : metric.unit;

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-muted">{metric.label}</span>
        {last !== undefined && <span className="font-medium tabular">→ {last.toFixed(digits)}{unit}</span>}
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
            <YAxis domain={["auto", "auto"]} tickCount={3} width={44} tickFormatter={(v: number) => v.toFixed(digits)} {...axis} />
            <Tooltip
              {...tooltip}
              labelFormatter={(t) => fmtDay(Number(t))}
              formatter={(v, name) => [
                Array.isArray(v)
                  ? `${v.map((n) => Number(n).toFixed(digits)).join("–")}${unit}`
                  : `${Number(v).toFixed(digits)}${unit}`,
                name === "band" ? "90% band" : name === "p50" ? "Forecast" : metric.label,
              ]}
            />
            {today !== null && <ReferenceLine x={today} stroke="var(--line)" />}
            {metric.threshold !== null && (
              <ReferenceLine y={metric.threshold} stroke="var(--accent)" strokeDasharray="3 3" />
            )}
            {metric.crossDay !== null && (
              <ReferenceLine x={dayMs(metric.crossDay)} stroke="var(--accent)" strokeDasharray="3 3" />
            )}
            <Area dataKey="band" stroke="none" fill="var(--accent)" fillOpacity={0.14} isAnimationActive={false} />
            <Line
              dataKey="v"
              type="monotone"
              stroke="var(--fg)"
              strokeOpacity={0.8}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
              isAnimationActive={animate}
              animationDuration={600}
            />
            <Line
              dataKey="p50"
              type="monotone"
              stroke="var(--fg)"
              strokeDasharray="4 3"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
              isAnimationActive={animate}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[12px] text-faint">
        {metric.backtest
          ? `Backtest ${metric.backtest.n} d: error ±${metric.backtest.mae.toFixed(1)}${unit}, ${Math.round(metric.backtest.coverage * 100)}% inside band`
          : "Not enough history to backtest"}
      </p>
    </div>
  );
}

export function ForecastCard() {
  const { data, loading, error } = useFetch<Forecast>(paths.forecast());
  const today = useToday();
  const crossing = data?.metrics.find((m) => m.metric === "assist" && m.crossDay)
    ?? data?.metrics.find((m) => m.metric === "clearance" && m.crossDay);
  const headline = crossing?.crossDay
    ? `${crossing.metric === "assist" ? "Brace reaches full assist" : "Toe clearance falls below 1.2 cm"} around ${fmtDay(dayMs(crossing.crossDay))} (${fmtDay(dayMs(crossing.crossEarliest ?? crossing.crossDay))}–${crossing.crossLatest ? fmtDay(dayMs(crossing.crossLatest)) : "later"})`
    : "No thresholds crossed in the next 90 days.";

  return (
    <Card title="Forecast, next 90 days" action={<span className="text-[13px] text-muted">90% band · fitted in Tiger Data</span>}>
      {loading && !data ? (
        <Skeleton className="h-64" />
      ) : error || !data?.metrics.length ? (
        <Empty>Forecast appears once 2 weeks of daily data exist.</Empty>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="text-[15px]">{headline}</p>
            {data.nearTrips && (
              <p className="mt-1 text-[13px] text-muted">
                Near-trips: {data.nearTrips.perWeekNow.toFixed(1)}/week now, about {data.nearTrips.perWeekIn90.toFixed(1)}/week in 90 days.
              </p>
            )}
          </div>
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {data.metrics.map((metric) => <Trend key={metric.metric} metric={metric} today={today} />)}
          </div>
        </div>
      )}
    </Card>
  );
}
