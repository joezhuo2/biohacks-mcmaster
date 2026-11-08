"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import { press, pressTransition } from "./motion";

type Variant = "primary" | "secondary" | "ghost";

const styles: Record<Variant, string> = {
  primary: "bg-accent-strong text-on-accent hover:bg-accent",
  secondary: "bg-surface-2 text-fg hover:bg-line",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: HTMLMotionProps<"button"> & { variant?: Variant }) {
  return (
    <motion.button
      type="button"
      whileTap={props.disabled ? undefined : press}
      transition={pressTransition}
      className={`inline-flex h-9 select-none items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:cursor-default disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${styles[variant]} ${className}`}
      {...props}
    />
  );
}

export function Chip({
  active,
  className = "",
  ...props
}: HTMLMotionProps<"button"> & { active: boolean }) {
  return (
    <motion.button
      type="button"
      aria-pressed={active}
      whileTap={press}
      transition={pressTransition}
      className={`h-7 select-none rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
        active ? "bg-fg text-bg" : "bg-surface-2 text-muted hover:text-fg"
      } ${className}`}
      {...props}
    />
  );
}
