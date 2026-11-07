"use client";

import { AnimatePresence, motion } from "motion/react";
import { useChime } from "@/hooks/useChime";
import type { CareEvent } from "@/lib/types";
import { Button } from "../Button";
import { fmtTime } from "../format";
import { spring } from "../motion";

const variants = {
  hidden: { y: "-120%", opacity: 0 },
  shown: { y: 0, opacity: 1 },
};

export function NearTripSheet({ alert, onDismiss }: { alert: CareEvent | null; onDismiss: () => void }) {
  const chime = useChime();

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          key={alert.id}
          role="alertdialog"
          aria-labelledby="trip-title"
          aria-describedby="trip-body"
          variants={variants}
          initial="hidden"
          animate="shown"
          exit="hidden"
          transition={spring}
          onAnimationStart={(def) => def === "shown" && chime()}
          className="fixed inset-x-0 top-3 z-50 mx-auto w-[min(520px,calc(100%-24px))] rounded-3xl bg-surface p-5 shadow-float"
        >
          <div className="flex gap-4">
            <span className={`mt-1.5 size-3 shrink-0 rounded-full ${alert.type === "fall" ? "bg-danger" : "bg-warn"}`} />
            <div className="min-w-0 flex-1">
              <h2 id="trip-title" className="text-lg font-semibold tracking-[-0.01em]">
                {alert.type === "fall" ? "Possible fall" : "Possible trip"}
                {alert.terrain && alert.terrain !== "level" ? " on the stairs" : ""}
              </h2>
              <p id="trip-body" className="mt-1 text-[15px] text-muted">
                At {fmtTime(alert.time)}. It may be a good moment to check in with Alex.
              </p>
              <div className="mt-4 flex justify-end">
                <Button variant="primary" onClick={onDismiss} autoFocus>
                  I&apos;ve checked in
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
