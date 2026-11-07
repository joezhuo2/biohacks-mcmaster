"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { Button } from "./Button";
import { spring } from "./motion";
import { Portal } from "./Portal";

export function SideSheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-40">
          <motion.div
            className="absolute inset-0 bg-[var(--scrim)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "100%", opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.6 }}
            transition={spring}
            className="absolute inset-y-2 right-2 flex w-[min(640px,calc(100%-16px))] flex-col overflow-hidden rounded-3xl bg-surface shadow-float"
          >
            <header className="flex items-start justify-between gap-4 px-7 pt-6 pb-4">
              <div>
                <h2 className="text-xl font-semibold tracking-display">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-muted">{subtitle}</p>}
              </div>
              <Button variant="secondary" onClick={onClose} autoFocus aria-label="Close" className="size-8 px-0">
                <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
                  <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </Button>
            </header>
            <div className="flex-1 overflow-y-auto px-7 pb-8">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
