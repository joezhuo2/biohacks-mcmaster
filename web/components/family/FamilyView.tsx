"use client";

import { useEvents } from "@/hooks/useEvents";
import { useFetch } from "@/hooks/useFetch";
import { useLive } from "@/hooks/useLive";
import { useNow, useToday } from "@/hooks/useNow";
import { useReportList } from "@/hooks/useReports";
import { paths } from "@/lib/api";
import type { DailyMetrics, Report } from "@/lib/types";
import { Hero } from "./Hero";
import { NearTripSheet } from "./NearTripSheet";
import { TodayStrip } from "./TodayStrip";
import { WeeklyStability } from "./WeeklyStability";
import { WeeklySummary } from "./WeeklySummary";

const ALERT_TTL = 15 * 60_000;

export function FamilyView({ dismissed, onDismiss }: { dismissed: string | null; onDismiss: (id: string) => void }) {
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

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-6 pb-16">
      <Hero status={status} events={events} now={now} connection={connection} />
      <TodayStrip events={events} today={today} now={now} loading={eventsLoading} />
      <WeeklyStability daily={daily.data} loading={daily.loading} />
      <WeeklySummary report={report} loading={reports.loading} />
      <NearTripSheet alert={showAlert} onDismiss={() => alert && onDismiss(alert.id)} />
    </div>
  );
}
