import { EventEmitter } from 'node:events';
import type { Sample, Status, WsMessage } from './types';

const shared = globalThis as typeof globalThis & {
  afoBus?: EventEmitter;
  afoLive?: { status: Status; sampleAt: number; sourceAt: number; queue: Sample[]; timer?: ReturnType<typeof setTimeout> };
};
export const bus = shared.afoBus ??= new EventEmitter();
export const live = shared.afoLive ??= {
  status: { wearing: false, terrain: 'level', assistPct: 0, lastSeen: null },
  sampleAt: 0,
  sourceAt: 0,
  queue: [],
};

export function publish(message: WsMessage) {
  bus.emit('message', message);
}

export function publishSamples(samples: Sample[]) {
  for (const sample of [...samples].sort((a, b) => a.time.localeCompare(b.time))) {
    const time = Date.parse(sample.time);
    if (time - live.sourceAt < 50) continue;
    live.sourceAt = time;
    live.queue.push(sample);
  }
  live.queue = live.queue.slice(-20);
  function flush() {
    live.timer = undefined;
    const sample = live.queue.shift();
    if (!sample) return;
    live.sampleAt = performance.now();
    publish({ kind: 'sample', data: sample });
    if (live.queue.length) live.timer = setTimeout(flush, 50);
  }
  if (!live.timer && live.queue.length) live.timer = setTimeout(flush, Math.max(0, 50 - (performance.now() - live.sampleAt)));
}
