"use client";

import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { useFetch } from "@/hooks/useFetch";
import { DAY, useToday } from "@/hooks/useNow";
import { paths } from "@/lib/api";
import type { ClinicScore, DailyMetrics, HourCell } from "@/lib/types";
import { SegmentedControl } from "../SegmentedControl";
import { SectionNav } from "../SectionNav";
import { Section } from "../Sections";
import { CalendarIcon, ForecastIcon, OverviewIcon, ProgressionIcon, ReportsIcon } from "../SectionIcons";
import { EngineCard } from "./EngineCard";
import { EventsCard } from "./EventsCard";
import { ForecastCard } from "./ForecastCard";
import { Heatmap as HeatmapBase } from "./Heatmap";
import { KpiRow } from "./KpiRow";
import { LiveCard as LiveCardBase } from "./LiveCard";
import type { Range } from "./metrics";
import { ProgressionCard as ProgressionCardBase } from "./ProgressionCard";
import { ReportsCard } from "./ReportsCard";
import { SimilarDaysCard } from "./SimilarDaysCard";

const Heatmap = memo(HeatmapBase);
const LiveCard = memo(LiveCardBase);
const ProgressionCard = memo(ProgressionCardBase);

type PhysicianSection = "forecast" | "overview" | "progression" | "patterns" | "reports";

const sections: { id: PhysicianSection; label: string; icon: ReactNode }[] = [
  { id: "forecast", label: "Forecast", icon: <ForecastIcon /> },
  { id: "overview", label: "Overview", icon: <OverviewIcon /> },
  { id: "progression", label: "Progression", icon: <ProgressionIcon /> },
  { id: "patterns", label: "Patterns", icon: <CalendarIcon /> },
  { id: "reports", label: "Reports", icon: <ReportsIcon /> },
];

const ranges: { value: Range; label: string }[] = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function PhysicianView() {
  const [section, setSection] = useState<PhysicianSection>("forecast");
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

  const forecastCards = useMemo(() => <ForecastCard />, []);
  const overviewCards = useMemo(() => (
    <>
      <KpiRow daily={daily.data} loading={daily.loading} today={today} range={range} />
      <div className="grid gap-5 xl:grid-cols-2">
        <LiveCard />
        <EngineCard />
      </div>
    </>
  ), [daily.data, daily.loading, today, range]);
  const progressionCards = useMemo(() => (
    <>
      <ProgressionCard
        daily={daily.data}
        loading={daily.loading}
        scores={scores.data}
        scoresLoading={scores.loading}
        onAdded={added}
      />
      <SimilarDaysCard />
    </>
  ), [daily.data, daily.loading, scores.data, scores.loading, added]);
  const patternCards = useMemo(() => (
    <>
      <Heatmap cells={hourly.data} loading={hourly.loading} today={today} />
      <EventsCard from={from} range={range} />
    </>
  ), [hourly.data, hourly.loading, today, from, range]);
  const reportCards = useMemo(() => <ReportsCard range={range} today={today} />, [range, today]);

  return (
    <div className="mx-auto grid max-w-[1600px] gap-6 px-6 pt-8 pb-16 lg:pl-[88px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[2rem] font-semibold leading-tight tracking-display">Alex Chen</h1>
          <p className="text-[15px] text-muted">47, ALS. Right foot drop, adaptive AFO prototype.</p>
        </div>
        <SegmentedControl label="Range" options={ranges} value={range} onChange={setRange} size="sm" />
      </div>
      <SectionNav label="Physician sections" sections={sections} value={section} onChange={setSection} id="physician-sections" />
      <div className="relative min-w-0">
        <Section active={section === "forecast"}>{forecastCards}</Section>
        <Section active={section === "overview"}>{overviewCards}</Section>
        <Section active={section === "progression"}>{progressionCards}</Section>
        <Section active={section === "patterns"}>{patternCards}</Section>
        <Section active={section === "reports"}>{reportCards}</Section>
      </div>
    </div>
  );
}
