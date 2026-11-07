import { EventEmitter } from 'node:events';
import type { Sample, Status, WsMessage } from './types';

const shared = globalThis as typeof globalThis & {
  afoBus?: EventEmitter;
  afoLive?: { status: Status; sourceAt: number };
};
export const bus = shared.afoBus ??= new EventEmitter();
export const live = shared.afoLive ??= {
  status: { wearing: false, terrain: 'level', assistPct: 0, lastSeen: null },
  sourceAt: 0,
};

export function publish(message: WsMessage) {
  bus.emit('message', message);
}

export function publishSamples(samples: Sample[]) {
  for (const sample of [...samples].sort((a, b) => a.time.localeCompare(b.time))) {
    const time = Date.parse(sample.time);
    if (time - live.sourceAt < 20) continue;
    live.sourceAt = time;
    publish({ kind: 'sample', data: sample });
  }
}
