"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function pct(p: number): string {
  if (p < 0.001) return "<0.1%";
  return `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
}

function comparedToAverage(p: number, base: number): string {
  const ratio = p / base;
  if (ratio >= 1.1) return `about ${ratio.toFixed(1)}× the average reported crash (${pct(base)})`;
  if (ratio > 0.9) return `close to the average reported crash (${pct(base)})`;
  return `about ${Math.round(ratio * 100)}% of the average reported crash (${pct(base)})`;
}

export function ResultSummary({ probability, baseRate }: { probability: number; baseRate: number }) {
  const width = Math.max(probability * 100, 0.8);
  const baseLeft = baseRate * 100;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Chance of a fatal or serious injury</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">{pct(probability)}</p>
        <p className="mt-2 text-sm text-foreground">{comparedToAverage(probability, baseRate)}</p>
      </div>
      <div aria-hidden className="relative pt-5">
        <div className="h-2.5 w-full rounded-full bg-muted">
          <div className="h-2.5 rounded-full bg-primary transition-[width] duration-500"
               style={{ width: `${width}%` }} />
        </div>
        <div className="absolute top-0 flex flex-col items-center" style={{ left: `${baseLeft}%`, transform: "translateX(-50%)" }}>
          <span className="text-[11px] text-muted-foreground">avg</span>
          <span className="h-5 w-px bg-foreground/50" />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>0%</span><span>50%</span><span>100%</span>
        </div>
      </div>
    </div>
  );
}

export type WhatIfRow = { label: string; probability: number | null; failed?: boolean };

export function WhatIfList({ rows, base, loading }: { rows: WhatIfRow[]; base: number; loading: boolean }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">What if…</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">The same crash with one detail changed.</p>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {rows.map((row) => {
          const diff = row.probability === null ? null : (row.probability - base) * 100;
          const up = diff !== null && diff >= 0.5;
          const down = diff !== null && diff <= -0.5;
          return (
            <li key={row.label} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
              <span>{row.label}</span>
              {loading && row.probability === null && !row.failed ? (
                <Skeleton className="h-4 w-20" />
              ) : row.failed || row.probability === null ? (
                <span className="text-xs text-muted-foreground">couldn&apos;t load</span>
              ) : (
                <span className="flex items-center gap-2 tabular-nums">
                  <span className="font-medium">{pct(row.probability)}</span>
                  <span className={cn("flex w-16 items-center justify-end gap-0.5 text-xs",
                    up ? "text-risk" : down ? "text-safer" : "text-muted-foreground")}>
                    {up ? <ArrowUp className="size-3" /> : down ? <ArrowDown className="size-3" /> : <Minus className="size-3" />}
                    {diff !== null && Math.abs(diff) >= 0.5 ? `${Math.abs(diff).toFixed(0)} pts` : "same"}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        These are patterns the model learned from reported crashes, not proof that the change itself
        causes the difference.
      </p>
    </div>
  );
}
