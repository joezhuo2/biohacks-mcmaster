"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Mode = "family" | "physician";

const KEY = "afo-mode";
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function read(): Mode {
  return localStorage.getItem(KEY) === "physician" ? "physician" : "family";
}

export function useMode() {
  const mode = useSyncExternalStore<Mode | null>(subscribe, read, () => null);
  const setMode = useCallback((m: Mode) => {
    localStorage.setItem(KEY, m);
    listeners.forEach((l) => l());
  }, []);
  return [mode, setMode] as const;
}
