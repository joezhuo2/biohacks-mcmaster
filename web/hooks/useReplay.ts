"use client";

import { useEffect, useRef, useState } from "react";
import data from "@/data/physionet-replay.json";

export const replayData = data;
export type Replay = { start: number; count: number; running: boolean };

const intervals = data.strides.flatMap(row => [row.left, row.right]);
const sorted = [...intervals].sort((a, b) => a - b);
const median = (sorted[Math.floor((sorted.length - 1) / 2)] + sorted[Math.floor(sorted.length / 2)]) / 2;
const windows = Array.from({ length: 36 }, (_, i) => {
  const values = intervals.slice(Math.floor(i * intervals.length / 36), Math.floor((i + 1) * intervals.length / 36));
  return {
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    trips: values.filter(value => Math.abs(value - median) > median * 0.2).length,
  };
});
const min = Math.min(...windows.map(window => window.mean));
const max = Math.max(...windows.map(window => window.mean));
export const replayCells = windows.map(window => ({
  value: max > min ? (window.mean - min) / (max - min) : 0.5,
  trips: window.trips,
}));

export function useReplay() {
  const root = useRef<HTMLDivElement>(null);
  const [replay, setReplay] = useState<Replay | null>(null);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = document.activeElement;
      if (event.key.toLowerCase() !== "s" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat || event.isComposing) return;
      if (target instanceof HTMLElement && (target.closest("input, textarea, select") || target.isContentEditable)) return;
      if (!root.current || root.current.closest('[inert], [aria-hidden="true"]')) return;
      setReplay({ start: performance.now(), count: 0, running: true });
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  const start = replay?.start;
  useEffect(() => {
    if (start === undefined) return;
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - start;
      const count = Math.min(36, Math.floor(elapsed / 400));
      const running = elapsed < data.left.length / data.sampleRate * 1000;
      setReplay(current => current?.start === start && (current.count !== count || current.running !== running)
        ? { start, count, running } : current);
      if (!running) window.clearInterval(timer);
    }, 50);
    return () => window.clearInterval(timer);
  }, [start]);

  return { root, replay };
}
