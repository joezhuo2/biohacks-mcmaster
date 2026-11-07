"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Connection } from "@/hooks/useLive";
import type { CareEvent, Status } from "@/lib/types";
import { ago, fmtDay, fmtTime } from "../format";
import { spring } from "../motion";

type Tone = "calm" | "warn" | "danger";

const HOUR = 3_600_000;

function sentence(status: Status | null, events: CareEvent[], now: number): [string, Tone] {
  const trip = events.find(
    (e) => (e.type === "near_trip" || e.type === "fall") && now - Date.parse(e.time) < 2 * HOUR,
  );
  if (trip) {
    const where = trip.terrain && trip.terrain !== "level" ? " on the stairs" : "";
    const what = trip.type === "fall" ? "Possible fall" : "Possible trip";
    return [`${what}${where} at ${fmtTime(trip.time)}.`, trip.type === "fall" ? "danger" : "warn"];
  }
  if (!status) return ["Waiting to hear from Alex's brace.", "calm"];
  if (!status.wearing) return ["Alex's brace is off right now.", "calm"];
  const tiring =
    status.assistPct >= 60 ||
    events.some((e) => e.type === "assist_increase" && now - Date.parse(e.time) < HOUR);
  if (tiring) return ["Alex's foot is tiring; the brace is helping more.", "calm"];
  return ["Alex is walking steadily today.", "calm"];
}

function detail(status: Status | null, events: CareEvent[], now: number, connection: Connection) {
  if (!status) return connection === "closed" ? "Can't reach the brace right now." : "Connecting to the brace.";
  const seen = status.lastSeen ? Date.parse(status.lastSeen) : null;
  if (status.wearing) return seen ? `Brace on, updated ${ago(now - seen)}` : "Brace on";
  const off = events.find((e) => e.type === "afo_off");
  const since = off ? Date.parse(off.time) : seen;
  if (!since) return "Brace off";
  const sameDay = new Date(since).toDateString() === new Date(now).toDateString();
  return `Brace off since ${sameDay ? fmtTime(since) : fmtDay(since)}`;
}

const dot: Record<Tone, string> = { calm: "bg-ok", warn: "bg-warn", danger: "bg-danger" };

export function Hero({
  status,
  events,
  now,
  connection,
}: {
  status: Status | null;
  events: CareEvent[];
  now: number | null;
  connection: Connection;
}) {
  const [text, tone] = now === null ? ["", "calm" as Tone] : sentence(status, events, now);
  const sub = now === null ? "" : detail(status, events, now, connection);
  const muted = !status || !status.wearing;

  return (
    <section className="pt-10 pb-2">
      <div className="min-h-[7.5rem] sm:min-h-[8.5rem]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.h1
            key={text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={spring}
            className="max-w-[18ch] text-[2.75rem] font-semibold leading-[1.05] tracking-display sm:text-[3.5rem]"
          >
            {text}
          </motion.h1>
        </AnimatePresence>
      </div>
      <p className="mt-4 flex items-center gap-2 text-[15px] text-muted">
        <span className={`size-2 rounded-full ${muted && tone === "calm" ? "bg-faint" : dot[tone]}`} />
        <span className="tabular">{sub}</span>
      </p>
    </section>
  );
}
