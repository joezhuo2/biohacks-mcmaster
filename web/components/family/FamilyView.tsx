"use client";

import { useEvents } from "@/hooks/useEvents";
import { useFetch } from "@/hooks/useFetch";
import { useLive } from "@/hooks/useLive";
import { useNow, useToday } from "@/hooks/useNow";
import { useReportList } from "@/hooks/useReports";
import { paths } from "@/lib/api";
import type { DailyMetrics, Report } from "@/lib/types";
import { memo, useMemo, useState, type ReactNode } from "react";
import { SectionNav } from "../SectionNav";
import { Section } from "../Sections";
import { CalendarIcon, TodayIcon } from "../SectionIcons";
import { Hero } from "./Hero";
import { NearTripSheet } from "./NearTripSheet";
import { TodayStrip as TodayStripBase } from "./TodayStrip";
import { WeeklyStability as WeeklyStabilityBase } from "./WeeklyStability";
import { WeeklySummary as WeeklySummaryBase } from "./WeeklySummary";

const TodayStrip = memo(TodayStripBase);
const WeeklyStability = memo(WeeklyStabilityBase);
const WeeklySummary = memo(WeeklySummaryBase);

const ALERT_TTL = 15 * 60_000;

type FamilySection = "today" | "week";

const sections: { id: FamilySection; label: string; icon: ReactNode }[] = [
  { id: "today", label: "Today", icon: <TodayIcon /> },
  { id: "week", label: "Week", icon: <CalendarIcon /> },
];

export function FamilyView({ dismissed, onDismiss }: { dismissed: string | null; onDismiss: (id: string) => void }) {
  const [section, setSection] = useState<FamilySection>("today");
  const now = useNow();
  const today = useToday();
  const status = useLive((s) => s.status);
  const connection = useLive((s) => s.connection);
  const alert = useLive((s) => s.alert);
  const { events, loading: eventsLoading } = useEvents(today);
  const daily = useFetch<DailyMetrics[]>(paths.daily(14));
  const reports = useFetch<Report[]>(paths.reports("family"));
  const [report] = useReportList(reports.data, "family");

  const showAlert =
    alert && alert.id !== dismissed && now !== null && now - Date.parse(alert.time) < ALERT_TTL ? alert : null;

  const todayCards = useMemo(() => (
    <>
      <Hero status={status} events={events} now={now} connection={connection} />
      <TodayStrip events={events} today={today} now={now} loading={eventsLoading} />
    </>
  ), [status, events, now, connection, today, eventsLoading]);
  const weekCards = useMemo(() => (
    <>
      <WeeklyStability daily={daily.data} loading={daily.loading} />
      <WeeklySummary report={report} loading={reports.loading} />
    </>
  ), [daily.data, daily.loading, report, reports.loading]);

  return (
    <div className="mx-auto max-w-5xl px-6 pt-8 pb-16">
      <div className="grid gap-6 lg:grid-cols-[56px_minmax(0,1fr)]">
        <SectionNav label="Family sections" sections={sections} value={section} onChange={setSection} id="family-sections" />
        <div className="relative min-w-0">
          <Section active={section === "today"}>{todayCards}</Section>
          <Section active={section === "week"}>{weekCards}</Section>
        </div>
      </div>
      <NearTripSheet alert={showAlert} onDismiss={() => alert && onDismiss(alert.id)} />
    </div>
  );
}
