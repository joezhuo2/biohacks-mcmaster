"use client";

import { useMemo, type ReactNode } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useLive } from "@/hooks/useLive";
import { useNow } from "@/hooks/useNow";
import { AnimatedNumber } from "../AnimatedNumber";
import { Card, Empty } from "../Card";
import { axis } from "../charts";
import { ago, cm, terrainLabel } from "../format";

const TARGET_CM = 2;
const SCALE_CM = 4;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-display">{children}</div>
    </div>
  );
}

function Trace() {
  const samples = useLive((s) => s.samples);
  const data = useMemo(() => samples.map((s) => ({ t: Date.parse(s.time), deg: s.ankleDeg })), [samples]);
  if (!data.length) return <Empty className="h-44">Waiting for live data from the brace.</Empty>;
  const end = data[data.length - 1].t;

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <XAxis
            dataKey="t"
            type="number"
            domain={[end - 10_000, end]}
            allowDataOverflow
            ticks={[end - 10_000, end - 5_000, end]}
            tickFormatter={(t: number) => (t === end ? "now" : `-${Math.round((end - t) / 1000)} s`)}
            {...axis}
          />
          <YAxis domain={[-25, 20]} ticks={[-20, -10, 0, 10, 20]} unit="°" {...axis} />
          <ReferenceLine y={0} stroke="var(--line)" />
          <Line
            dataKey="deg"
            type="monotone"
            stroke="var(--accent)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Clearance() {
  const step = useLive((s) => s.lastStep);
  if (!step) return <Stat label="Last-step clearance">--</Stat>;
  const value = cm(step.minClearanceMm);
  const below = value < TARGET_CM;
  return (
    <div>
      <Stat label="Last-step clearance">
        <AnimatedNumber value={value} digits={1} />
        <span className="ml-1 text-sm font-normal text-muted">cm</span>
      </Stat>
      <div className="relative mt-2 h-1.5 rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${below ? "bg-accent" : "bg-fg/70"}`}
          style={{ width: `${Math.min(100, (value / SCALE_CM) * 100)}%` }}
        />
        <span
          className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-muted"
          style={{ left: `${(TARGET_CM / SCALE_CM) * 100}%` }}
          title="2 cm target"
        />
      </div>
      <div className="mt-1 text-xs text-muted">Target {TARGET_CM} cm</div>
    </div>
  );
}

export function LiveCard() {
  const status = useLive((s) => s.status);
  const connection = useLive((s) => s.connection);
  const lastSample = useLive((s) => s.samples.at(-1));
  const now = useNow();

  const wearing = !status
    ? connection === "closed"
      ? "Server unreachable"
      : "No status yet"
    : status.wearing
      ? "Wearing"
      : "Brace off";
  const lag = now !== null && lastSample ? now - Date.parse(lastSample.time) : 0;

  return (
    <Card
      title="Live"
      action={
        <div className="flex items-center gap-2 text-[13px]">
          {status && (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">{terrainLabel[status.terrain]}</span>
          )}
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-muted">
            <span className={`size-1.5 rounded-full ${status?.wearing ? "bg-ok" : "bg-faint"}`} />
            {wearing}
          </span>
        </div>
      }
    >
      <div className="mb-2 flex items-baseline justify-between text-[13px] text-muted">
        <span>Ankle angle, last 10 s (+ dorsiflexion)</span>
        {lag > 5_000 && <span className="tabular">Paused, last data {ago(lag)}</span>}
      </div>
      <Trace />
      <div className="mt-5 grid grid-cols-2 gap-6 border-t border-line pt-5">
        <Clearance />
        <Stat label="Assist">
          {status ? (
            <>
              <AnimatedNumber value={status.assistPct} />
              <span className="ml-0.5 text-sm font-normal text-muted">%</span>
            </>
          ) : (
            "--"
          )}
        </Stat>
      </div>
    </Card>
  );
}
