"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLive, useLiveStore } from "@/hooks/useLive";
import { useNow } from "@/hooks/useNow";
import { replayData } from "@/hooks/useReplay";
import { AnimatedNumber } from "../AnimatedNumber";
import { Card, Empty } from "../Card";
import { ago, cm, terrainLabel } from "../format";

const TARGET_CM = 2;
const SCALE_CM = 4;

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-display">{children}</div>
    </div>
  );
}

const WINDOW_MS = 10_000;
const PLAYBACK_DELAY_MS = 300;
const Y_MIN = -25;
const Y_MAX = 20;
const Y_TICKS = [-20, -10, 0, 10, 20];
const GUTTER = 30;

function Trace({ replayStart }: { replayStart: number | null }) {
  const store = useLiveStore();
  const hasData = useLive((s) => s.samples.length > 0);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d")!;
    let colors = { accent: "", right: "", line: "", muted: "", font: "" };
    const readColors = () => {
      const css = getComputedStyle(el);
      colors = {
        accent: css.getPropertyValue("--accent"),
        right: css.getPropertyValue("--peach"),
        line: css.getPropertyValue("--line"),
        muted: css.getPropertyValue("--muted"),
        font: `11px ${css.fontFamily}`,
      };
    };
    let frame = 0;
    let shownEnd = 0;
    let prevFrame = performance.now();

    const paint = () => {
      const { samples } = store.state;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const plot = w - GUTTER;
      const replaying = replayStart !== null;
      const y = (value: number) => 6 + (replaying ? 1 - value : (Y_MAX - value) / (Y_MAX - Y_MIN)) * (h - 12);
      ctx.clearRect(0, 0, w, h);
      ctx.font = colors.font;
      ctx.textBaseline = "middle";
      ctx.lineWidth = 1;
      for (const t of replaying ? [0, 0.5, 1] : Y_TICKS) {
        ctx.fillStyle = colors.muted;
        ctx.fillText(replaying ? t.toFixed(1) : `${t}°`, 0, y(t));
        if (t === 0) {
          ctx.strokeStyle = colors.line;
          ctx.beginPath();
          ctx.moveTo(GUTTER, y(0));
          ctx.lineTo(w, y(0));
          ctx.stroke();
        }
      }
      if (!samples.length && !replaying) return;
      const end = shownEnd;
      const x = (t: number) => GUTTER + ((t - (end - WINDOW_MS)) / WINDOW_MS) * plot;
      ctx.save();
      ctx.beginPath();
      ctx.rect(GUTTER, 0, plot, h);
      ctx.clip();
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      if (replaying) {
        const step = 1000 / replayData.sampleRate;
        const first = Math.max(0, Math.floor((end - WINDOW_MS) / step));
        const last = Math.min(replayData.left.length - 1, Math.floor(end / step));
        [replayData.left, replayData.right].forEach((values, side) => {
          ctx.strokeStyle = side ? colors.right : colors.accent;
          ctx.beginPath();
          for (let i = first; i <= last; i++) {
            if (i === first) ctx.moveTo(x(i * step), y(values[i]));
            else ctx.lineTo(x(i * step), y(values[i]));
          }
          ctx.stroke();
        });
        ctx.restore();
        return;
      }
      ctx.beginPath();
      samples.forEach((s, i) => {
        const px = x(Date.parse(s.time));
        const py = y(s.ankleDeg);
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    };

    const loop = (t: number) => {
      frame = requestAnimationFrame(loop);
      const dt = t - prevFrame;
      prevFrame = t;
      const { samples, sampleArrivedAt } = store.state;
      if (replayStart !== null) {
        shownEnd = Math.min(t - replayStart, replayData.left.length / replayData.sampleRate * 1000);
      } else if (samples.length) {
        // advance by frame time and ease toward the data clock so bursty batches never make the trace jump backwards
        const target = Date.parse(samples[samples.length - 1].time) + Math.min(t - sampleArrivedAt, 2_000) - PLAYBACK_DELAY_MS;
        shownEnd = Math.abs(target - shownEnd) > 1_000 ? target : Math.max(shownEnd, shownEnd + dt + (target - shownEnd - dt) * 0.08);
      }
      paint();
    };

    const resize = () => {
      const dpr = devicePixelRatio || 1;
      const w = Math.round(el.clientWidth * dpr);
      const h = Math.round(el.clientHeight * dpr);
      if (el.width === w && el.height === h) return;
      el.width = w;
      el.height = h;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };
    readColors();
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", readColors);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      scheme.removeEventListener("change", readColors);
    };
  }, [store, hasData, replayStart]);

  if (!hasData && replayStart === null) return <Empty className="h-44">Waiting for live data from the brace.</Empty>;
  return (
    <div>
      <canvas ref={canvas} className="block h-40 w-full" aria-label={replayStart === null ? "Live ankle angle trace" : "PhysioNet ALS als1 left and right normalized foot force, last 10 seconds"} role="img" />
      <div className="mt-1 flex justify-between pl-[30px] text-[11px] text-muted">
        <span>-10 s</span>
        <span>-5 s</span>
        <span>now</span>
      </div>
    </div>
  );
}

function Clearance() {
  const step = useLive((s) => s.lastStep);
  if (!step) return <Stat label="Last-step clearance">--</Stat>;
  const value = cm(step.minClearanceMm);
  const below = value < TARGET_CM;
  return (
    <div>
      <Stat label="Last-step clearance">
        <AnimatedNumber value={value} digits={1} />
        <span className="ml-1 text-sm font-normal text-muted">cm</span>
      </Stat>
      <div className="relative mt-2 h-1.5 rounded-full bg-surface-2">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${below ? "bg-accent" : "bg-fg/70"}`}
          style={{ width: `${Math.min(100, (value / SCALE_CM) * 100)}%` }}
        />
        <span
          className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-muted"
          style={{ left: `${(TARGET_CM / SCALE_CM) * 100}%` }}
          title="2 cm target"
        />
      </div>
      <div className="mt-1 text-xs text-muted">Target {TARGET_CM} cm</div>
    </div>
  );
}

export function LiveCard({ replayStart = null }: { replayStart?: number | null }) {
  const status = useLive((s) => s.status);
  const connection = useLive((s) => s.connection);
  const lastSampleSec = useLive((s) => (s.samples.length ? Math.floor(Date.parse(s.samples[s.samples.length - 1].time) / 1000) : 0));
  const now = useNow();

  const wearing = !status
    ? connection === "closed"
      ? "Server unreachable"
      : "No status yet"
    : status.wearing
      ? "Wearing"
      : "Brace off";
  const lag = now !== null && lastSampleSec ? now - lastSampleSec * 1000 : 0;

  return (
    <Card
      title="Live"
      action={
        <div className="flex items-center gap-2 text-[13px]">
          {replayStart !== null && <span role="status" className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">Replay: PhysioNet ALS record als1</span>}
          {replayStart === null && status && (
            <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium">{terrainLabel[status.terrain]}</span>
          )}
          <span className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-muted">
            <span className={`size-1.5 rounded-full ${status?.wearing ? "bg-ok" : "bg-faint"}`} />
            {wearing}
          </span>
        </div>
      }
    >
      <div className="mb-2 flex items-baseline justify-between text-[13px] text-muted">
        <span>{replayStart === null ? "Ankle angle, last 10 s (+ dorsiflexion)" : "Foot force (normalized 0–1), last 10 s"}</span>
        {replayStart === null && lag > 5_000 && <span className="tabular">Paused, last data {ago(lag)}</span>}
      </div>
      <Trace replayStart={replayStart} />
      {replayStart !== null && <div className="mt-2 flex gap-4 text-xs text-muted"><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-accent" />Left</span><span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-peach" />Right</span><span>Brace metrics below remain live</span></div>}
      <div className="mt-5 grid grid-cols-2 gap-6 border-t border-line pt-5">
        <Clearance />
        <Stat label="Assist">
          {status ? (
            <>
              <AnimatedNumber value={status.assistPct} />
              <span className="ml-0.5 text-sm font-normal text-muted">%</span>
            </>
          ) : (
            "--"
          )}
        </Stat>
      </div>
    </Card>
  );
}
