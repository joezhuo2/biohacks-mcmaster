"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { press, pressTransition, spring } from "./motion";

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  const h = size === "sm" ? "h-7 text-[13px]" : "h-8 text-sm";
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-surface-2 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <motion.button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            whileTap={press}
            transition={pressTransition}
            className={`relative select-none rounded-full px-3.5 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${h} ${
              active ? "text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {active && (
              <motion.span
                layoutId={`${id}-thumb`}
                transition={spring}
                className="absolute inset-0 rounded-full bg-surface shadow-[0_1px_3px_rgb(0_0_0/0.12)]"
              />
            )}
            <span className="relative">{o.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
