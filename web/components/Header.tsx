"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useLive, type Connection } from "@/hooks/useLive";
import type { Mode } from "@/hooks/useMode";
import { SegmentedControl } from "./SegmentedControl";

const modes: { value: Mode; label: string }[] = [
  { value: "family", label: "Family" },
  { value: "physician", label: "Physician" },
];

const connectionLabel: Record<Connection, string> = {
  connecting: "Connecting",
  open: "Live",
  closed: "Reconnecting",
};

function ConnectionDot() {
  const connection = useLive((s) => s.connection);
  const color = connection === "open" ? "bg-ok" : "bg-faint";
  return (
    <div className="flex items-center gap-2 text-[13px] text-muted" role="status" aria-live="polite">
      <span className="relative flex size-2">
        {connection === "open" && (
          <span className={`absolute inset-0 rounded-full ${color} animate-ping opacity-40 [animation-duration:2.4s] motion-reduce:hidden`} />
        )}
        <span className={`relative size-2 rounded-full transition-colors ${color}`} />
      </span>
      {connectionLabel[connection]}
    </div>
  );
}

export function Header({ mode, onMode }: { mode: Mode | null; onMode: (m: Mode) => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-30">
      <div className="chrome">
        <div className="mx-auto grid h-14 max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6">
          <div className="flex items-baseline gap-2 truncate">
            <span className="text-[15px] font-semibold tracking-[-0.01em]">AFO Care</span>
            <span className="hidden text-[13px] text-muted sm:inline">Alex Chen</span>
          </div>
          <SegmentedControl label="View" options={modes} value={mode} onChange={onMode} />
          <div className="flex justify-end">
            <ConnectionDot />
          </div>
        </div>
      </div>
      <motion.div
        aria-hidden
        className="chrome-edge pointer-events-none absolute inset-x-0 top-full h-5"
        initial={false}
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
    </header>
  );
}
