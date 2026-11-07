import type {
  Audience,
  CareEvent,
  ClinicScore,
  DailyMetrics,
  EventType,
  HourCell,
  Report,
  Status,
} from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText);
  return res.json() as Promise<T>;
}

function query(params: Record<string, string | number | undefined>) {
  const entries = Object.entries(params).filter((e): e is [string, string | number] => e[1] !== undefined);
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : "";
}

export const paths = {
  status: () => "/api/status",
  events: (p: { from?: string; to?: string; type?: EventType }) => `/api/events${query(p)}`,
  daily: (days: number) => `/api/metrics/daily${query({ days })}`,
  hourly: (days: number) => `/api/metrics/hourly${query({ days })}`,
  clinicScores: () => "/api/clinic-scores",
  reports: (audience: Audience) => `/api/reports${query({ audience })}`,
};

export type NewClinicScore = Omit<ClinicScore, "id">;

export const api = {
  status: () => request<Status>(paths.status()),
  events: (p: Parameters<typeof paths.events>[0]) => request<CareEvent[]>(paths.events(p)),
  daily: (days: number) => request<DailyMetrics[]>(paths.daily(days)),
  hourly: (days: number) => request<HourCell[]>(paths.hourly(days)),
  clinicScores: () => request<ClinicScore[]>(paths.clinicScores()),
  addClinicScore: (body: NewClinicScore) =>
    request<ClinicScore>(paths.clinicScores(), { method: "POST", body: JSON.stringify(body) }),
  reports: (audience: Audience) => request<Report[]>(paths.reports(audience)),
  generateReport: (body: { audience: Audience; from: string; to: string }) =>
    request<Report>("/api/reports", { method: "POST", body: JSON.stringify(body) }),
};
