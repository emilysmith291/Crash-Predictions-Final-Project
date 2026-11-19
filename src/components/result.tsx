"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

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

/** Counts up from 0 to `value` (instantly when reduced motion is on). */
function useCountUp(value: number, reduce: boolean | null) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, value, { duration: 0.9, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => controls.stop();
  }, [value, reduce]);
  return reduce ? value : shown;
}

export function ResultSummary({ probability, baseRate }: { probability: number; baseRate: number }) {
  const reduce = useReducedMotion();
  const shown = useCountUp(probability, reduce);
  const width = Math.max(probability * 100, 0.8);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">Chance of a fatal or serious injury</p>
        <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">
          {shown >= probability ? pct(probability) : `${(shown * 100).toFixed(probability < 0.1 ? 1 : 0)}%`}
        </p>
        <motion.p className="mt-2 text-sm text-foreground"
          initial={reduce ? false : { opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          {comparedToAverage(probability, baseRate)}
        </motion.p>
      </div>
      <div aria-hidden className="relative pt-5">
        <div className="h-2.5 w-full rounded-full bg-muted">
          <motion.div className="h-2.5 rounded-full bg-primary"
            initial={reduce ? false : { width: 0 }} animate={{ width: `${width}%` }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
        </div>
        <div className="absolute top-0 flex flex-col items-center"
             style={{ left: `${baseRate * 100}%`, transform: "translateX(-50%)" }}>
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

/**
 * Dot chart: every row shares one 0-100% scale. A grey dot marks the current
 * estimate; the coloured dot glides from there to the what-if value.
 */
export function WhatIfChart({ rows, base, loading }: { rows: WhatIfRow[]; base: number; loading: boolean }) {
  const reduce = useReducedMotion();
  const x = (p: number) => `${Math.min(Math.max(p * 100, 0), 100)}%`;
  return (
    <div>
      <h3 className="text-sm font-semibold">What if…</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        The same crash with one detail changed. Grey dot = your estimate.
      </p>
      <ul className="mt-4 flex flex-col gap-3.5">
        {rows.map((row, i) => {
          const p = row.probability;
          const diff = p === null ? null : (p - base) * 100;
          const up = diff !== null && diff >= 0.5;
          const down = diff !== null && diff <= -0.5;
          const tone = up ? "var(--risk)" : down ? "var(--safer)" : "var(--muted-foreground)";
          return (
            <li key={row.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
              <span className="text-sm">{row.label}</span>
              {loading && p === null && !row.failed ? (
                <Skeleton className="h-4 w-14" />
              ) : row.failed || p === null ? (
                <span className="text-xs text-muted-foreground">couldn&apos;t load</span>
              ) : (
                <span className="flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-sm font-medium">{pct(p)}</span>
                  <span className="w-12 text-right text-xs" style={{ color: tone }}>
                    {diff !== null && Math.abs(diff) >= 0.5 ? `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(0)} pts` : "same"}
                  </span>
                </span>
              )}
              <div aria-hidden className="relative col-span-2 h-3">
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/60"
                      style={{ left: x(base) }} />
                {p !== null && (
                  <>
                    <motion.span className="absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full"
                      style={{ background: tone, left: x(Math.min(base, p)) }}
                      initial={reduce ? false : { width: 0 }}
                      animate={{ width: `${Math.abs(p - base) * 100}%` }}
                      transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }} />
                    <motion.span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card"
                      style={{ background: tone }}
                      initial={reduce ? false : { left: x(base) }}
                      animate={{ left: x(p) }}
                      transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }} />
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
        <span>0%</span><span>50%</span><span>100%</span>
      </div>
      <p className={cn("mt-3 text-xs text-muted-foreground")}>
        These are patterns the model learned from reported crashes, not proof that the change itself
        causes the difference.
      </p>
    </div>
  );
}
