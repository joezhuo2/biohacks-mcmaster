"use client";

import { useMemo, useState } from "react";
import type { HourCell } from "@/lib/types";
import { DAY } from "@/hooks/useNow";
import { Card, Empty, Skeleton } from "../Card";
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

export function Heatmap({ cells, loading, today }: { cells?: HourCell[]; loading: boolean; today: number | null }) {
  const [hover, setHover] = useState<{ day: string; hour: number; cell: Cell } | null>(null);

  const { grid, min, max } = useMemo(() => {
    const grid = new Map<string, Cell>();
    let min = Infinity;
    let max = -Infinity;
    for (const c of cells ?? []) {
      // Backend buckets are UTC; shift to the viewer's local day and hour.
      const t = Date.parse(`${c.day.slice(0, 10)}T${String(c.hour).padStart(2, "0")}:00:00Z`);
      const d = new Date(t);
      const key = `${localDayKey(t)}:${d.getHours()}`;
      grid.set(key, { clearance: c.avgClearanceMm, trips: c.nearTrips });
      if (c.avgClearanceMm > 0) {
        min = Math.min(min, c.avgClearanceMm);
        max = Math.max(max, c.avgClearanceMm);
      }
    }
    return { grid, min, max };
  }, [cells]);

  if (today === null || (loading && !cells)) {
    return (
      <Card title="Time of day">
        <Skeleton className="h-[420px]" />
      </Card>
    );
  }
  if (!grid.size) {
    return (
      <Card title="Time of day">
        <Empty>No hourly data for the last 14 days.</Empty>
      </Card>
    );
  }

  const days = Array.from({ length: DAYS }, (_, i) => today - (DAYS - 1 - i) * DAY);
  const width = LEFT + hours.length * (CELL + GAP);
  const height = TOP + days.length * (CELL + GAP);
  const scale = (mm: number) => (max > min ? (max - mm) / (max - min) : 0.5);

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
          role="img"
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
                  const cell = grid.get(`${key}:${h}`);
                  const x = LEFT + i * (CELL + GAP);
                  return (
                    <g key={h} onPointerEnter={() => cell && setHover({ day: key, hour: h, cell })}>
                      <rect
                        x={x}
                        y={y}
                        width={CELL}
                        height={CELL}
                        rx={6}
                        style={{ fill: cell?.clearance ? fill(scale(cell.clearance)) : "var(--surface-2)" }}
                        opacity={cell?.clearance ? 1 : 0.5}
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
      <p className="mt-3 h-5 text-[13px] text-muted tabular">
        {hover
          ? `${fmtDay(Date.parse(`${hover.day}T00:00:00`))}, ${fmtHour(hover.hour)}: ${(hover.cell.clearance / 10).toFixed(2)} cm avg clearance${
              hover.cell.trips ? `, ${hover.cell.trips} near-trip${hover.cell.trips > 1 ? "s" : ""}` : ""
            }`
          : "Hover a cell for details. Darker means lower clearance."}
      </p>
    </Card>
  );
}
