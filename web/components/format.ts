import type { Terrain } from "@/lib/types";

export const dayKey = (iso: string) => iso.slice(0, 10);

export function dayDate(key: string) {
  const [y, m, d] = key.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const dayMs = (key: string) => dayDate(key).getTime();

export function localDayKey(ms: number) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const stampFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const fmtTime = (t: string | number) => timeFmt.format(new Date(t));
export const fmtDay = (t: number | Date) => dayFmt.format(t);
export const fmtWeekday = (t: number | Date) => weekdayFmt.format(t);
export const fmtStamp = (t: string | number) => stampFmt.format(new Date(t));
export const fmtDayKey = (key: string) => dayFmt.format(dayDate(key));

export function fmtHour(h: number) {
  const suffix = h < 12 || h === 24 ? "AM" : "PM";
  return `${h % 12 || 12} ${suffix}`;
}

export function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export const cm = (mm: number) => mm / 10;

export const terrainLabel: Record<Terrain, string> = {
  level: "Level",
  stairs_up: "Stairs up",
  stairs_down: "Stairs down",
};
