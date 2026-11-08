"use client";

import { motion } from "motion/react";
import { memo, startTransition, useEffect, useState, type ReactNode } from "react";
import { Skeleton } from "./Card";
import { spring } from "./motion";

function SectionSkeleton() {
  return (
    <div role="status" aria-label="Loading section" className="space-y-5">
      <Skeleton className="h-64 rounded-2xl" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    </div>
  );
}

const idle = (cb: () => void) => {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(cb, { timeout: 4000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(cb, 300);
  return () => window.clearTimeout(id);
};

export const Section = memo(function Section({ active, children }: { active: boolean; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [hidden, setHidden] = useState(!active);
  if (active && hidden) setHidden(false);

  useEffect(() => {
    if (mounted) return;
    if (!active) return idle(() => startTransition(() => setMounted(true)));
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => startTransition(() => setMounted(true)));
    });
    return () => cancelAnimationFrame(frame);
  }, [active, mounted]);

  return (
    <motion.div
      inert={!active}
      aria-hidden={!active}
      aria-busy={active && !mounted}
      className={active ? "relative" : `pointer-events-none absolute inset-x-0 top-0 ${hidden ? "invisible h-0 overflow-hidden" : ""}`}
      initial={false}
      animate={{ opacity: active ? 1 : 0, y: active ? 0 : 8 }}
      transition={active ? spring : { duration: 0.12 }}
      onAnimationComplete={() => { if (!active) setHidden(true); }}
    >
      {mounted ? (
        <motion.div className="space-y-5" initial={active ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: 0.18, ease: "easeOut" }}>
          {children}
        </motion.div>
      ) : (
        active && <SectionSkeleton />
      )}
    </motion.div>
  );
}, (prev, next) => prev.active === next.active && prev.children === next.children);
