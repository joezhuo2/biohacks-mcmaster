"use client";

import { useFetch } from "@/hooks/useFetch";
import { paths } from "@/lib/api";
import type { GaitDay, SimilarDays } from "@/lib/types";
import { Card, Empty, Skeleton } from "../Card";
import { fmtDayKey } from "../format";

const features: { key: keyof Omit<GaitDay, "day">; label: string; fmt: (v: number) => string }[] = [
  { key: "clearanceMm", label: "Toe clearance", fmt: (v) => `${(v / 10).toFixed(2)} cm` },
  { key: "dorsiDeg", label: "Ankle lift", fmt: (v) => `${v.toFixed(1)}°` },
  { key: "strideCv", label: "Stride variability", fmt: (v) => `${(v * 100).toFixed(1)}%` },
  { key: "assistPct", label: "Assist", fmt: (v) => `${v.toFixed(0)}%` },
];

export function SimilarDaysCard() {
  const { data, loading } = useFetch<SimilarDays>(paths.similarDays());
  const best = data?.matches[0];
  const als = data?.alsProgress;

  return (
    <Card title="Days like today" action={<span className="text-[13px] text-muted">pgvector · DiskANN</span>}>
      {loading && !data ? (
        <Skeleton className="h-48" />
      ) : !data?.today || !best ? (
        <Empty>Needs more than a week of walking history.</Empty>
      ) : (
        <div className="space-y-5">
          <p className="text-[1.35rem] font-semibold leading-snug tracking-display">
            Today resembles <span className="text-accent-strong">{fmtDayKey(best.day)}</span>
          </p>
          <table className="w-full text-[13px] tabular">
            <thead className="text-muted">
              <tr>
                <th className="pb-1.5 text-left font-normal" />
                <th className="pb-1.5 text-right font-normal">Today</th>
                <th className="pb-1.5 text-right font-normal">{fmtDayKey(best.day)}</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f) => (
                <tr key={f.key} className="border-t border-line">
                  <td className="py-1.5 text-muted">{f.label}</td>
                  <td className="py-1.5 text-right font-medium">{f.fmt(data.today![f.key])}</td>
                  <td className="py-1.5 text-right">{f.fmt(best[f.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.matches.length > 1 && (
            <p className="text-xs text-muted">
              Also close: {data.matches.slice(1).map((m) => fmtDayKey(m.day)).join(", ")}. Matched on z-scored clearance, ankle lift,
              stride variability and assist, excluding the last 7 days.
            </p>
          )}
          {als && (
            <div>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-muted">Gait position, PhysioNet control to ALS average</span>
                <span className="font-medium tabular">{Math.round(als.overall * 100)}%</span>
              </div>
              <div className="relative mt-2 h-2 rounded-full bg-surface-2">
                <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${als.overall * 100}%` }} />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-muted">
                <span>Control</span>
                <span className="tabular">
                  stride time {Math.round(als.stride * 100)}%, rhythm {Math.round(als.rhythm * 100)}%
                </span>
                <span>ALS</span>
              </div>
              <p className="mt-2 text-xs text-faint">Exploratory measure from stride timing only, not diagnostic.</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
