"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import { useFetch } from "@/hooks/useFetch";
import { DAY } from "@/hooks/useNow";
import { useReportList } from "@/hooks/useReports";
import { api, ApiError, paths } from "@/lib/api";
import type { Report } from "@/lib/types";
import { Button } from "../Button";
import { Card, Empty, Skeleton } from "../Card";
import { fmtDay, fmtStamp } from "../format";
import { press, pressTransition, spring } from "../motion";
import { ReportBody } from "../ReportBody";
import { SideSheet } from "../SideSheet";
import type { Range } from "./metrics";

const span = (r: Report) => `${fmtDay(Date.parse(r.rangeStart))} to ${fmtDay(Date.parse(r.rangeEnd))}`;

export function ReportsCard({ range, today }: { range: Range; today: number | null }) {
  const fetched = useFetch<Report[]>(paths.reports("physician"));
  const [created, setCreated] = useState<Report[]>([]);
  const reports = useReportList(fetched.data, "physician", created);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const open = reports.find((r) => r.id === openId);
  const close = useCallback(() => setSheet(false), []);
  const show = (id: string) => {
    setOpenId(id);
    setSheet(true);
  };

  async function generate() {
    if (today === null) return;
    setPending(true);
    setFailure(null);
    try {
      const report = await api.generateReport({
        audience: "physician",
        from: new Date(today - (range - 1) * DAY).toISOString(),
        to: new Date().toISOString(),
      });
      setCreated((c) => [report, ...c]);
      show(report.id);
    } catch (err) {
      setFailure(err instanceof ApiError ? `Report failed: ${err.message}.` : "Could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      title="Gemini report"
      action={
        <Button variant="primary" onClick={generate} disabled={pending || today === null}>
          {pending ? "Generating" : `Generate for last ${range} days`}
        </Button>
      }
    >
      <p className="text-[13px] text-muted">
        Findings, progression vs baseline, suggested physiotherapy focus for Daniela Ferreira to review, and questions for
        the next visit.
      </p>
      <AnimatePresence initial={false}>
        {pending && (
          <motion.div
            key="pending"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-2.5 rounded-lg bg-surface-2/60 p-4" aria-live="polite">
              <p className="text-[13px] text-muted">Writing the report for the last {range} days. This can take a few seconds.</p>
              <Skeleton className="h-3 w-3/4 bg-line" />
              <Skeleton className="h-3 bg-line" />
              <Skeleton className="h-3 w-5/6 bg-line" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {failure && <p className="mt-3 text-[13px] text-accent-strong">{failure}</p>}

      <h3 className="mt-5 mb-1 text-[13px] font-medium text-muted">History</h3>
      {fetched.loading && !reports.length ? (
        <Skeleton className="h-24" />
      ) : reports.length ? (
        <ul className="-mx-2 max-h-72 overflow-y-auto">
          {reports.map((r) => (
            <li key={r.id}>
              <motion.button
                type="button"
                onClick={() => show(r.id)}
                whileTap={press}
                transition={pressTransition}
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2.5 text-left hover:bg-surface-2/60 focus-visible:outline-2 focus-visible:outline-accent"
              >
                <span className="text-sm font-medium">{span(r)}</span>
                <span className="text-xs text-muted tabular">Created {fmtStamp(r.createdAt)}</span>
              </motion.button>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>{fetched.error ? "Could not load past reports." : "No reports yet. Generate one for the selected range."}</Empty>
      )}

      <SideSheet
        open={sheet && !!open}
        onClose={close}
        title="Physician report"
        subtitle={open && `${span(open)}. Created ${fmtStamp(open.createdAt)}.`}
      >
        {open && <ReportBody markdown={open.markdown} />}
      </SideSheet>
    </Card>
  );
}
