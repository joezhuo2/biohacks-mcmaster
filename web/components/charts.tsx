"use client";

import { useReducedMotion } from "motion/react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

export const axis = {
  stroke: "var(--faint)",
  tick: { fill: "var(--muted)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const tooltip = {
  contentStyle: {
    background: "var(--surface)",
    border: "none",
    borderRadius: 12,
    boxShadow: "var(--shadow-lg)",
    color: "var(--fg)",
    fontSize: 12,
    padding: "8px 10px",
  },
  labelStyle: { color: "var(--muted)", marginBottom: 2 },
  itemStyle: { color: "var(--fg)", padding: 0 },
  cursor: { stroke: "var(--line)", strokeWidth: 1 },
} as const;

export function useChartAnimation() {
  return !useReducedMotion();
}

export function Sparkline<T extends object>({
  data,
  dataKey,
  height = 56,
}: {
  data: T[];
  dataKey: keyof T & string;
  height?: number;
}) {
  const animate = useChartAnimation();
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
          <YAxis hide domain={["dataMin - 4", "dataMax + 4"]} />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke="var(--accent)"
            strokeWidth={2.25}
            dot={false}
            activeDot={false}
            isAnimationActive={animate}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
