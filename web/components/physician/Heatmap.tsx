"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { HourCell } from "@/lib/types";
import { replayCells, type Replay } from "@/hooks/useReplay";
import { Card, Empty, Skeleton } from "../Card";
import { tooltip } from "../charts";
import { spring } from "../motion";
import { Portal } from "../Portal";
import { fmtDay, fmtHour, fmtWeekday, localDayKey } from "../format";

const FIRST = 6;
const LAST = 23;
const hours = Array.from({ length: LAST - FIRST + 1 }, (_, i) => FIRST + i);
const DAYS = 14;
const CELL = 26;
const GAP = 3;
const LEFT = 64;
const TOP = 20;

type Cell = { clearance: number; trips: number };

function fill(t: number) {
  return `color-mix(in oklab, var(--accent) ${Math.round(12 + t * 78)}%, var(--surface-2))`;
}

export function Heatmap({ cells, loading, today, replay }: { cells?: HourCell[]; loading: boolean; today: number | null; replay?: Replay | null }) {
  const [hover, setHover] = useState<{ day: string; hour: number; cell?: Cell; x: number; y: number } | null>(null);
  const reduced = useReducedMotion();
  const id = useId();
  useEffect(() => {
    const clear = () => setHover(null);
    window.addEventListener("scroll", clear, true);
    window.addEventListener("resize", clear);
    return () => {
      window.removeEventListener("scroll", clear, true);
      window.removeEventListener("resize", clear);
    };
  }, []);
  const show = (el: SVGGElement, day: string, hour: number, cell?: Cell) => {
    const rect = el.getBoundingClientRect();
    setHover({ day, hour, cell, x: Math.max(8, Math.min(rect.left + rect.width / 2 - 110, window.innerWidth - 228)), y: rect.top > 90 ? rect.top - 82 : rect.bottom + 8 });
  };

  const { grid, hourMean, min, max } = useMemo(() => {
    const grid = new Map<string, Cell>();
    let min = Infinity;
    let max = -Infinity;
    const sums = new Map<number, [number, number]>();
    for (const c of cells ?? []) {
      // Backend buckets are UTC; shift to the viewer's local day and hour.
      const t = Date.parse(`${c.day.slice(0, 10)}T${String(c.hour).padStart(2, "0")}:00:00Z`);
      const d = new Date(t);
      const key = `${localDayKey(t)}:${d.getHours()}`;
      grid.set(key, { clearance: c.avgClearanceMm, trips: c.nearTrips });
      if (c.avgClearanceMm > 0) {
        min = Math.min(min, c.avgClearanceMm);
        max = Math.max(max, c.avgClearanceMm);
        const [sum, n] = sums.get(d.getHours()) ?? [0, 0];
        sums.set(d.getHours(), [sum + c.avgClearanceMm, n + 1]);
      }
    }
    const hourMean = new Map([...sums].map(([h, [sum, n]]) => [h, sum / n]));
    return { grid, hourMean, min: Number.isFinite(min) ? min : 10, max: Number.isFinite(max) ? max : 40 };
  }, [cells]);

  if (today === null || (loading && !cells && !replay)) {
    return (
      <Card title="Time of day">
        <Skeleton className="h-[420px]" />
      </Card>
    );
  }
  if (!grid.size && !replay) {
    return (
      <Card title="Time of day">
        <Empty>No hourly data for the last 14 days.</Empty>
      </Card>
    );
  }

  const days = Array.from({ length: DAYS }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (DAYS - 1 - i));
    return date.getTime();
  });
  const width = LEFT + hours.length * (CELL + GAP);
  const height = TOP + days.length * (CELL + GAP);
  const scale = (mm: number) => (max > min ? Math.min(1, Math.max(0, (max - mm) / (max - min))) : 0.5);

  return (
    <Card
      title="Time of day, toe clearance"
      action={
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="flex items-center gap-1.5">
            Higher
            <span className="h-2 w-16 rounded-full" style={{ background: `linear-gradient(to right, ${fill(0)}, ${fill(1)})` }} />
            Lower
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-warn" />
            Near-trip
          </span>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[520px]"
          role="group"
          aria-label="Average toe clearance by hour for the last 14 days, with near-trips marked"
          onPointerLeave={() => setHover(null)}
        >
          {hours.map((h, i) =>
            h % 3 === 0 ? (
              <text key={h} x={LEFT + i * (CELL + GAP) + CELL / 2} y={12} textAnchor="middle" fontSize={10} fill="var(--muted)">
                {fmtHour(h)}
              </text>
            ) : null,
          )}
          {days.map((d, r) => {
            const key = localDayKey(d);
            const y = TOP + r * (CELL + GAP);
            return (
              <g key={key}>
                <text x={0} y={y + CELL / 2 + 4} fontSize={10.5} fill="var(--muted)">
                  {fmtWeekday(d)} {fmtDay(d)}
                </text>
                {hours.map((h, i) => {
                  const index = (r - (DAYS - 2)) * hours.length + i;
                  const demo = replay && index >= 0;
                  const value = replayCells[index];
                  const cell = demo ? (index < replay.count ? { clearance: (hourMean.get(h) ?? (min + max) / 2) * (1.1 - 0.2 * value.value), trips: value.trips } : undefined) : grid.get(`${key}:${h}`);
                  const x = LEFT + i * (CELL + GAP);
                  return (
                    <g
                      key={`${h}:${demo ? replay.start : "live"}:${Boolean(cell)}`}
                      tabIndex={0}
                      role="img"
                      aria-label={`${key}, ${fmtHour(h)}: ${cell ? `${(cell.clearance / 10).toFixed(2)} cm clearance, ${cell.trips} near-trips${demo ? ", stride-derived demo" : ""}` : "No data"}`}
                      aria-describedby={hover?.day === key && hover.hour === h ? id : undefined}
                      onPointerEnter={event => show(event.currentTarget, key, h, cell)}
                      onPointerLeave={() => setHover(null)}
                      onFocus={event => show(event.currentTarget, key, h, cell)}
                      onBlur={() => setHover(null)}
                      onKeyDown={event => { if (event.key === "Escape") setHover(null); }}
                    >
                      <motion.rect
                        x={x}
                        y={y}
                        width={CELL}
                        height={CELL}
                        rx={3}
                        style={{ fill: cell?.clearance ? fill(scale(cell.clearance)) : "var(--surface-2)" }}
                        initial={demo && cell && !reduced ? { opacity: 0, scale: 0.85 } : false}
                        animate={{ opacity: cell?.clearance ? 1 : 0.5, scale: 1 }}
                        transition={reduced ? { duration: 0 } : spring}
                      />
                      {cell && cell.trips > 0 && (
                        <circle
                          cx={x + CELL / 2}
                          cy={y + CELL / 2}
                          r={Math.min(4 + cell.trips, 7)}
                          style={{ fill: "var(--warn)", stroke: "var(--surface)", strokeWidth: 2 }}
                        />
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {replay && <div className="mt-3 text-xs text-muted">Last 2 days: stride-derived replay demo, not measured toe clearance.</div>}
      <Portal>
        <AnimatePresence>
          {hover && (
            <motion.div
              id={id}
              role="tooltip"
              className="pointer-events-none fixed left-0 top-0 z-50 w-[220px] tabular"
              style={tooltip.contentStyle}
              initial={{ opacity: 0, scale: reduced ? 1 : 0.96, x: hover.x, y: hover.y + (reduced ? 0 : 4) }}
              animate={{ opacity: 1, scale: 1, x: hover.x, y: hover.y }}
              exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
              transition={reduced ? { duration: 0 } : spring}
            >
              <div style={tooltip.labelStyle}>{fmtWeekday(Date.parse(`${hover.day}T00:00:00`))} {fmtDay(Date.parse(`${hover.day}T00:00:00`))}, {fmtHour(hover.hour)}</div>
              <div>{hover.cell ? `${(hover.cell.clearance / 10).toFixed(2)} cm avg clearance` : "No clearance data"}</div>
              <div>Near-trips: {hover.cell?.trips ?? 0}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </Portal>
    </Card>
  );
}
