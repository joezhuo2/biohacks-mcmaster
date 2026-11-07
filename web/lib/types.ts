export type Terrain = 'level' | 'stairs_up' | 'stairs_down';

export type EventType =
  | 'near_trip'
  | 'fall'
  | 'assist_increase'
  | 'assist_decrease'
  | 'stairs_start'
  | 'stairs_end'
  | 'afo_on'
  | 'afo_off';

export type Audience = 'family' | 'physician';

export interface Sample {
  time: string;
  ankleDeg: number;
  assistPct: number;
}

export interface Step {
  time: string;
  terrain: Terrain;
  minClearanceMm: number;
  peakDorsiDeg: number;
  strideMs: number;
  assistPct: number;
}

export interface CareEvent {
  id: string;
  time: string;
  type: EventType;
  severity: 1 | 2 | 3;
  message: string;
  terrain?: Terrain;
}

export interface ClinicScore {
  id: string;
  date: string;
  alsfrsR?: number;
  walk10mSec?: number;
  note?: string;
}

export interface DailyMetrics {
  day: string;
  steps: number;
  stairSteps: number;
  avgClearanceMm: number;
  avgPeakDorsiDeg: number;
  avgAssistPct: number;
  nearTrips: number;
  falls: number;
  stabilityScore: number;
}

export interface HourCell {
  day: string;
  hour: number;
  avgClearanceMm: number;
  nearTrips: number;
}

export interface Report {
  id: string;
  createdAt: string;
  audience: Audience;
  rangeStart: string;
  rangeEnd: string;
  markdown: string;
}

export interface Status {
  wearing: boolean;
  terrain: Terrain;
  assistPct: number;
  lastSeen: string | null;
}

export interface IngestBody {
  samples: Sample[];
  steps?: Step[];
  events?: Omit<CareEvent, 'id'>[];
}

export type WsMessage =
  | { kind: 'sample'; data: Sample }
  | { kind: 'step'; data: Step }
  | { kind: 'event'; data: CareEvent }
  | { kind: 'status'; data: Status }
  | { kind: 'report'; data: Report };
