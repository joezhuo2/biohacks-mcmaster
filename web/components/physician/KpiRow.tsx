import type { DailyMetrics } from "@/lib/types";
import { Card, Empty, Skeleton } from "../Card";
import { summarize, windowOf, type Range, type Summary } from "./metrics";

const kpis: {
  key: keyof Summary;
  label: string;
  unit: string;
  digits: number;
  better: 1 | -1;
}[] = [
  { key: "stability", label: "Stability score", unit: "", digits: 0, better: 1 },
  { key: "clearanceCm", label: "Avg toe clearance", unit: "cm", digits: 2, better: 1 },
  { key: "dorsiDeg", label: "Peak dorsiflexion", unit: "°", digits: 1, better: 1 },
  { key: "assistPct", label: "Assist", unit: "%", digits: 0, better: -1 },
  { key: "tripsPer100", label: "Stair near-trips", unit: "per 100 stair steps", digits: 2, better: -1 },
];

function Delta({ diff, digits, better, range }: { diff: number | null; digits: number; better: 1 | -1; range: Range }) {
  if (diff === null) return <span className="text-faint">No previous {range} d</span>;
  const rounded = Number(diff.toFixed(digits));
  if (rounded === 0) return <span className="text-muted">No change vs prev {range} d</span>;
  const good = Math.sign(rounded) === better;
  return (
    <span className={good ? "text-ok" : "text-accent-strong"}>
      {rounded > 0 ? "↑" : "↓"} {Math.abs(rounded).toFixed(digits)} <span className="text-muted">vs prev {range} d</span>
    </span>
  );
}

export function KpiRow({
  daily,
  loading,
  today,
  range,
}: {
  daily?: DailyMetrics[];
  loading: boolean;
  today: number | null;
  range: Range;
}) {
  if (today === null || (loading && !daily)) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <Skeleton key={k.key} className="h-[7.5rem] rounded-3xl" />
        ))}
      </div>
    );
  }
  const cur = summarize(windowOf(daily ?? [], today, range));
  const prev = summarize(windowOf(daily ?? [], today, range, 1));
  if (!cur) {
    return (
      <Card>
        <Empty>No walking data in the last {range} days.</Empty>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
      {kpis.map((k) => {
        const v = cur[k.key];
        const p = prev?.[k.key];
        return (
          <section key={k.key} className="rounded-3xl bg-surface p-5 shadow-card">
            <div className="text-[13px] text-muted">{k.label}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-[2rem] font-semibold leading-none tracking-display tabular">
                {v === null ? "--" : v.toFixed(k.digits)}
              </span>
              <span className="truncate text-[13px] text-muted">{k.unit}</span>
            </div>
            <div className="mt-3 text-xs tabular">
              <Delta
                diff={v === null || p === null || p === undefined ? null : v - p}
                digits={k.digits}
                better={k.better}
                range={range}
              />
            </div>
          </section>
        );
      })}
    </div>
  );
}
