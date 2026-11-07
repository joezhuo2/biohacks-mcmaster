"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { useToday } from "@/hooks/useNow";
import { paths } from "@/lib/api";
import type { DailyMetrics } from "@/lib/types";
import { SegmentedControl } from "../SegmentedControl";
import { KpiRow } from "./KpiRow";
import { LiveCard } from "./LiveCard";
import type { Range } from "./metrics";

const ranges: { value: Range; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function PhysicianView() {
  const today = useToday();
  const [range, setRange] = useState<Range>(30);
  const daily = useFetch<DailyMetrics[]>(paths.daily(180));

  return (
    <div className="mx-auto max-w-[1600px] px-6 pt-8 pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-semibold leading-tight tracking-display">Alex Chen</h1>
          <p className="text-[15px] text-muted">47, ALS. Right foot drop, adaptive AFO prototype.</p>
        </div>
        <SegmentedControl label="Range" options={ranges} value={range} onChange={setRange} size="sm" />
      </div>
      <KpiRow daily={daily.data} loading={daily.loading} today={today} range={range} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <LiveCard />
        </div>
        <div className="min-w-0 space-y-5" />
      </div>
    </div>
  );
}
