"use client";

import { useSyncExternalStore } from "react";

let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function snapshot() {
  return now || (now = Date.now());
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

const DAY = 86_400_000;

export function useToday(): number | null {
  const t = useNow();
  if (t === null) return null;
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export { DAY };
