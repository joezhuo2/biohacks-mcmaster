"use client";

import { useMemo } from "react";
import type { Audience, Report } from "@/lib/types";
import { useLive } from "./useLive";

const none: Report[] = [];

export function useReportList(fetched: Report[] | undefined, audience: Audience, extra = none) {
  const live = useLive((s) => s.report);
  return useMemo(() => {
    const byId = new Map<string, Report>();
    for (const r of [...(fetched ?? []), ...extra]) byId.set(r.id, r);
    if (live?.audience === audience) byId.set(live.id, live);
    return [...byId.values()]
      .filter((r) => r.audience === audience)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }, [fetched, extra, live, audience]);
}
