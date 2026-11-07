"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

// Critically damped spring with a 0.35 s response: stiffness (2pi / 0.35)^2, damping 2 * sqrt(stiffness).
const config = { stiffness: 322, damping: 36, mass: 1 };

export function AnimatedNumber({ value, digits = 0 }: { value: number; digits?: number }) {
  const reduce = useReducedMotion();
  const target = useMotionValue(value);
  const live = useSpring(target, config);
  const text = useTransform(live, (v) => v.toFixed(digits));

  useEffect(() => {
    target.set(value);
    if (reduce) live.jump(value);
  }, [value, reduce, target, live]);

  return <motion.span className="tabular">{text}</motion.span>;
}
