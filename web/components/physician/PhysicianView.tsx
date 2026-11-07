"use client";

import { memo, useCallback, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { DAY, useToday } from "@/hooks/useNow";
import { paths } from "@/lib/api";
import type { ClinicScore, DailyMetrics, HourCell } from "@/lib/types";
import { SegmentedControl } from "../SegmentedControl";
import { EventsCard } from "./EventsCard";
import { Heatmap as HeatmapBase } from "./Heatmap";
import { KpiRow } from "./KpiRow";
import { LiveCard as LiveCardBase } from "./LiveCard";
import type { Range } from "./metrics";
import { ProgressionCard as ProgressionCardBase } from "./ProgressionCard";
import { ReportsCard } from "./ReportsCard";

const Heatmap = memo(HeatmapBase);
const LiveCard = memo(LiveCardBase);
const ProgressionCard = memo(ProgressionCardBase);

const ranges: { value: Range; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function PhysicianView() {
  const today = useToday();
  const [range, setRange] = useState<Range>(30);
  const daily = useFetch<DailyMetrics[]>(paths.daily(180));
  const hourly = useFetch<HourCell[]>(paths.hourly(14));
  const scores = useFetch<ClinicScore[]>(paths.clinicScores());
  const from = today === null ? null : today - (range - 1) * DAY;

  const { setData: setScores, reload: reloadScores } = scores;
  const added = useCallback(
    (s: ClinicScore) => {
      setScores((data) => [...(data ?? []), s]);
      reloadScores();
    },
    [setScores, reloadScores],
  );

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
          <ProgressionCard
            daily={daily.data}
            loading={daily.loading}
            scores={scores.data}
            scoresLoading={scores.loading}
            onAdded={added}
          />
        </div>
        <div className="min-w-0 space-y-5">
          <ReportsCard range={range} today={today} />
          <Heatmap cells={hourly.data} loading={hourly.loading} today={today} />
          <EventsCard from={from} range={range} />
        </div>
      </div>
    </div>
  );
}
