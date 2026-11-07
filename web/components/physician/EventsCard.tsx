"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useEvents } from "@/hooks/useEvents";
import type { EventType } from "@/lib/types";
import { Chip } from "../Button";
import { Card, Empty, Skeleton } from "../Card";
import { fmtStamp, terrainLabel } from "../format";
import { spring } from "../motion";
import type { Range } from "./metrics";

const filters: { id: string; label: string; types: EventType[] | null }[] = [
  { id: "all", label: "All", types: null },
  { id: "near_trip", label: "Near-trip", types: ["near_trip"] },
  { id: "fall", label: "Fall", types: ["fall"] },
  { id: "assist", label: "Assist change", types: ["assist_increase", "assist_decrease"] },
  { id: "stairs", label: "Stairs", types: ["stairs_start", "stairs_end"] },
];

const typeLabel: Record<EventType, string> = {
  near_trip: "Near-trip",
  fall: "Fall",
  assist_increase: "Assist up",
  assist_decrease: "Assist down",
  stairs_start: "Stairs start",
  stairs_end: "Stairs end",
  afo_on: "Brace on",
  afo_off: "Brace off",
};

const dot: Partial<Record<EventType, string>> = { near_trip: "bg-warn", fall: "bg-danger" };
const LIMIT = 80;

export function EventsCard({ from, range }: { from: number | null; range: Range }) {
  const [filter, setFilter] = useState("all");
  const { events, loading, error } = useEvents(from);
  const types = filters.find((f) => f.id === filter)?.types;
  const shown = types ? events.filter((e) => types.includes(e.type)) : events;

  return (
    <Card
      title="Events"
      action={
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter events">
          {filters.map((f) => (
            <Chip key={f.id} active={f.id === filter} onClick={() => setFilter(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
      }
    >
      {loading && !error ? (
        <Skeleton className="h-48" />
      ) : !shown.length ? (
        <Empty>{error ? "Could not load events." : `No matching events in the last ${range} days.`}</Empty>
      ) : (
        <ul className="-mx-2 max-h-[26rem] overflow-y-auto">
          <AnimatePresence initial={false}>
            {shown.slice(0, LIMIT).map((e) => (
              <motion.li
                key={e.id}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={spring}
                className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-2/60"
              >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot[e.type] ?? "bg-faint"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">
                      {typeLabel[e.type]}
                      {e.terrain && <span className="ml-2 font-normal text-muted">{terrainLabel[e.terrain]}</span>}
                    </span>
                    <time dateTime={e.time} className="shrink-0 text-xs text-muted tabular">
                      {fmtStamp(e.time)}
                    </time>
                  </div>
                  {e.message && <p className="truncate text-[13px] text-muted">{e.message}</p>}
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
          {shown.length > LIMIT && (
            <li className="px-2 py-3 text-center text-xs text-muted">Showing the latest {LIMIT} of {shown.length}.</li>
          )}
        </ul>
      )}
    </Card>
  );
}
