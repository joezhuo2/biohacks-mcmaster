"use client";

import { useEffect } from "react";
import { useFetch } from "@/hooks/useFetch";
import { paths } from "@/lib/api";
import type { EngineStats } from "@/lib/types";
import { AnimatedNumber } from "../AnimatedNumber";
import { Card, Skeleton } from "../Card";

const mb = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;

function Stat({ label, children, note }: { label: string; children: React.ReactNode; note: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1.5 text-[1.6rem] font-semibold leading-none tracking-display tabular">{children}</div>
      <div className="mt-2 text-xs text-muted tabular">{note}</div>
    </div>
  );
}

export function EngineCard() {
  const { data, reload } = useFetch<EngineStats>(paths.engine());
  useEffect(() => {
    const id = setInterval(reload, 2000);
    return () => clearInterval(id);
  }, [reload]);

  return (
    <Card title="Data engine" action={<span className="text-[13px] text-muted">Tiger Data · TimescaleDB</span>}>
      {!data ? (
        <Skeleton className="h-20" />
      ) : (
        <div className="grid grid-cols-3 gap-5">
          <Stat label="Live ingest" note="rows/s into hypertables, last 10 s">
            <AnimatedNumber value={data.ingestRowsPerSec} digits={0} />
          </Stat>
          <Stat
            label="90-day query"
            note={
              <>
                rollup vs {data.benchRows.toLocaleString()} raw rows: {data.rawMs.toFixed(0)} ms
              </>
            }
          >
            {data.rollupMs.toFixed(1)} ms
            <span className="ml-1.5 text-[13px] font-medium text-ok">{Math.round(data.rawMs / data.rollupMs)}× faster</span>
          </Stat>
          <Stat
            label="Compression"
            note={
              data.uncompressedBytes && data.compressedBytes
                ? `${mb(data.uncompressedBytes)} to ${mb(data.compressedBytes)}, ${data.compressedChunks}/${data.chunks} chunks`
                : "No compressed chunks yet"
            }
          >
            {data.compressionRatio ? `${data.compressionRatio.toFixed(1)}×` : "--"}
          </Stat>
        </div>
      )}
    </Card>
  );
}
