import type { CareEvent } from "@/lib/types";
import { Card, Empty, Skeleton } from "../Card";
import { fmtHour, fmtTime } from "../format";

const START = 7;
const END = 22;
const HOUR = 3_600_000;
const ticks = [7, 10, 13, 16, 19, 22];

function bouts(events: CareEvent[], now: number) {
  const asc = [...events].sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  const out: [number, number][] = [];
  let open: number | null = null;
  for (const e of asc) {
    if (e.type === "stairs_start") open = Date.parse(e.time);
    if (e.type === "stairs_end" && open !== null) {
      out.push([open, Date.parse(e.time)]);
      open = null;
    }
  }
  if (open !== null) out.push([open, Math.max(open, now)]);
  return out;
}

export function TodayStrip({
  events,
  today,
  now,
  loading,
}: {
  events: CareEvent[];
  today: number | null;
  now: number | null;
  loading: boolean;
}) {
  if (today === null || now === null || loading) {
    return (
      <Card title="Today">
        <Skeleton className="h-16" />
      </Card>
    );
  }

  const t0 = today + START * HOUR;
  const span = (END - START) * HOUR;
  const pos = (t: number) => Math.min(100, Math.max(0, ((t - t0) / span) * 100));
  const stairs = bouts(events, now);
  const trips = events.filter((e) => e.type === "near_trip" || e.type === "fall");
  const nowPct = pos(now);
  const quiet = !stairs.length && !trips.length;

  return (
    <Card
      title="Today"
      action={
        <div className="flex items-center gap-4 text-[13px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-1.5 rounded-full bg-faint" />
            Stairs
          </span>
          {trips.length > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-warn" />
              Possible trip
            </span>
          )}
        </div>
      }
    >
      <div className="relative h-12 rounded-lg bg-surface-2/70">
        <div className="absolute inset-y-0 left-0 rounded-l-2xl bg-line" style={{ width: `${nowPct}%` }} />
        {stairs.map(([a, b]) => (
          <span
            key={a}
            title={`Stairs at ${fmtTime(a)}`}
            className="absolute top-1/2 h-6 min-w-1.5 -translate-y-1/2 rounded-full bg-faint/70"
            style={{ left: `${pos(a)}%`, width: `${pos(b) - pos(a)}%` }}
          />
        ))}
        {trips.map((e) => (
          <span
            key={e.id}
            title={`${e.type === "fall" ? "Possible fall" : "Possible trip"} at ${fmtTime(e.time)}`}
            className={`absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-surface ${
              e.type === "fall" ? "bg-danger" : "bg-warn"
            }`}
            style={{ left: `${pos(Date.parse(e.time))}%` }}
          />
        ))}
        {now >= t0 && now <= t0 + span && (
          <span className="absolute inset-y-1.5 w-0.5 -translate-x-1/2 rounded-full bg-fg/60" style={{ left: `${nowPct}%` }} />
        )}
      </div>
      <div className="relative mt-2 h-4 text-[11px] tracking-label text-muted">
        {ticks.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
            style={{ left: `${((h - START) / (END - START)) * 100}%` }}
          >
            {fmtHour(h)}
          </span>
        ))}
      </div>
      {quiet && <Empty className="mt-4 min-h-0 py-3">No stairs yet today.</Empty>}
    </Card>
  );
}
