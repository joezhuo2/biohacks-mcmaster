"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api";
import type { CareEvent, Report, Sample, Status, Step, WsMessage } from "@/lib/types";

export type Connection = "connecting" | "open" | "closed";

export interface LiveState {
  connection: Connection;
  samples: Sample[];
  lastStep: Step | null;
  status: Status | null;
  events: CareEvent[];
  alert: CareEvent | null;
  report: Report | null;
}

const WINDOW_MS = 10_000;
const MAX_EVENTS = 100;

const initial: LiveState = {
  connection: "connecting",
  samples: [],
  lastStep: null,
  status: null,
  events: [],
  alert: null,
  report: null,
};

export function reduce(s: LiveState, msg: WsMessage): LiveState {
  switch (msg.kind) {
    case "sample": {
      const cutoff = Date.parse(msg.data.time) - WINDOW_MS;
      const kept = s.samples.filter((x) => Date.parse(x.time) >= cutoff);
      kept.push(msg.data);
      return { ...s, samples: kept };
    }
    case "step":
      return { ...s, lastStep: msg.data };
    case "status":
      return { ...s, status: msg.data };
    case "event": {
      const e = msg.data;
      const events = [e, ...s.events.filter((x) => x.id !== e.id)].slice(0, MAX_EVENTS);
      const alert = e.type === "near_trip" || e.type === "fall" ? e : s.alert;
      return { ...s, events, alert };
    }
    case "report":
      return { ...s, report: msg.data };
  }
}

export class LiveStore {
  state = initial;
  private listeners = new Set<() => void>();

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  set(next: LiveState) {
    this.state = next;
    this.listeners.forEach((l) => l());
  }
}

export function useLiveConnection() {
  const [store] = useState(() => new LiveStore());

  useEffect(() => {
    let ws: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    let disposed = false;
    const patch = (p: Partial<LiveState>) => store.set({ ...store.state, ...p });

    const refreshStatus = () =>
      api.status().then(
        (status) => !disposed && patch({ status }),
        () => {},
      );

    const connect = () => {
      const proto = location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${location.host}/ws`);
      ws.onopen = () => {
        attempt = 0;
        patch({ connection: "open" });
        refreshStatus();
      };
      ws.onmessage = (e) => {
        let msg: WsMessage;
        try {
          msg = JSON.parse(e.data);
        } catch {
          return;
        }
        store.set(reduce(store.state, msg));
      };
      ws.onclose = () => {
        if (disposed) return;
        patch({ connection: "closed" });
        retry = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 10_000));
      };
    };

    refreshStatus();
    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [store]);

  return store;
}

export const LiveContext = createContext<LiveStore | null>(null);

export function useLive<T>(select: (s: LiveState) => T): T {
  const store = useContext(LiveContext);
  if (!store) throw new Error("useLive must be used inside LiveContext");
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.state),
    () => select(initial),
  );
}
