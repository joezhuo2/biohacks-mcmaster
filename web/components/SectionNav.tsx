"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";
import { press, pressTransition, spring } from "./motion";

export function SectionNav<T extends string>({
  label,
  sections,
  value,
  onChange,
  id,
}: {
  label: string;
  sections: { id: T; label: string; icon: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  id: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const expanded = hovered || focused;

  const items = (desktop: boolean) => sections.map((section) => {
    const active = section.id === value;
    return (
      <li key={section.id} className="min-w-0 shrink-0">
        <motion.button
          type="button"
          aria-label={section.label}
          title={section.label}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            onChange(section.id);
            setHovered(false);
            setFocused(false);
          }}
          whileTap={press}
          transition={pressTransition}
          className={`relative flex w-full select-none items-center gap-3 whitespace-nowrap rounded-full py-3 text-left text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${desktop ? "px-[15px]" : "px-3.5"} ${active ? "text-fg" : "text-muted hover:text-fg"}`}
        >
          {active && (
            <motion.span
              layoutId={`${id}-${desktop ? "rail" : "row"}-thumb`}
              transition={spring}
              className="absolute inset-0 rounded-full bg-surface-2 shadow-control"
            />
          )}
          <span className="relative flex size-[18px] shrink-0 items-center justify-center" aria-hidden="true">{section.icon}</span>
          <motion.span
            className="relative"
            initial={false}
            animate={{ opacity: !desktop || expanded ? 1 : 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.12, delay: desktop && expanded && !reducedMotion ? 0.08 : 0 }}
          >
            {section.label}
          </motion.span>
        </motion.button>
      </li>
    );
  });

  return (
    <nav aria-label={label} className="relative min-w-0 lg:sticky lg:top-20 lg:z-30 lg:self-start">
      <ul className="flex max-w-full gap-1 overflow-x-auto rounded-3xl bg-surface p-1 lg:hidden">
        {items(false)}
      </ul>
      <motion.ul
        className="absolute left-0 top-0 hidden flex-col gap-1 overflow-hidden rounded-3xl bg-surface p-1 shadow-card lg:flex"
        initial={false}
        animate={{ width: expanded ? 200 : 56 }}
        transition={reducedMotion ? { duration: 0 } : spring}
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onFocusCapture={(event) => setFocused(event.target.matches(":focus-visible"))}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      >
        {items(true)}
      </motion.ul>
    </nav>
  );
}
