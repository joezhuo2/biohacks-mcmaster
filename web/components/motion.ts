import type { Transition } from "motion/react";

export const spring: Transition = { type: "spring", bounce: 0, duration: 0.35 };

export const press = { scale: 0.97 };
export const pressTransition: Transition = { type: "spring", bounce: 0, duration: 0.15 };
