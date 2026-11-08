"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { Button } from "./Button";
import { spring } from "./motion";
import { Portal } from "./Portal";

export function FallAlert() {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return setTime(null);
      if (e.key.toLowerCase() !== "a" || e.altKey || e.ctrlKey || e.metaKey || e.repeat || e.isComposing) return;
      const target = document.activeElement;
      if (target instanceof HTMLElement && (target.closest("input, textarea, select") || target.isContentEditable)) return;
      setTime(new Date());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Portal>
      <AnimatePresence>
        {time && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              className="absolute inset-0 bg-[var(--scrim)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTime(null)}
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="fall-alert-title"
              aria-describedby="fall-alert-desc"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={spring}
              className="relative w-[min(440px,100%)] overflow-hidden rounded-xl bg-surface shadow-float"
            >
              <div className="h-1.5 bg-danger" />
              <div className="px-7 pt-6 pb-6">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger text-on-accent">
                    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
                      <path d="M12 3l10 18H2L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M12 10v5M12 18v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <div>
                    <h2 id="fall-alert-title" className="text-xl font-semibold tracking-display text-danger">Fall detected</h2>
                    <p className="text-[13px] text-muted">
                      Wife was messaged at {time.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
                <p id="fall-alert-desc" className="mt-4 text-sm leading-relaxed">
                  The brace sensor picked up a sudden drop in shank angle followed by no movement. Alex may have fallen
                  and could need help right away.
                </p>
                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={() => setTime(null)} autoFocus>
                    Dismiss
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
