"use client";

import { useMemo } from "react";
import { paths } from "@/lib/api";
import type { CareEvent } from "@/lib/types";
import { useFetch } from "./useFetch";
import { useLive } from "./useLive";

export function useEvents(from: number | null) {
  const path = from === null ? null : paths.events({ from: new Date(from).toISOString() });
  const { data, error, loading } = useFetch<CareEvent[]>(path);
  const live = useLive((s) => s.events);

  const events = useMemo(() => {
    if (from === null) return [];
    const byId = new Map<string, CareEvent>();
    for (const e of data ?? []) byId.set(e.id, e);
    for (const e of live) if (Date.parse(e.time) >= from) byId.set(e.id, e);
    return [...byId.values()].sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  }, [data, live, from]);

  return { events, error, loading: loading && !live.length };
}
