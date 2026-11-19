"use client";

import { AlertCircle, ChevronDown, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { NumberField, SelectField } from "@/components/fields";
import { motion, useReducedMotion } from "motion/react";

import { ResultSummary, WhatIfChart, type WhatIfRow } from "@/components/result";
import { DrivingLoader, RoadScene } from "@/components/road";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { API_URL, ApiError, getOptions, predict, type CrashInput, type Options, type Prediction } from "@/lib/api";
import { FIELD_LABELS, hourLabel, MONTHS, optionLabel, PRESETS, SPEED_LIMITS, whatIfs } from "@/lib/labels";

const NOT_WITH_VEHICLE = "not_with_moving_vehicle";
const SLOW_AFTER_MS = 3500;

const MAIN_CHOICES = ["body_type", "seatbelt", "driver_sex", "area", "light", "weather"];
const MORE_CHOICES = ["intersection", "road_location", "work_zone", "day_of_week",
  "electronic_stability_control", "automatic_emergency_braking", "blind_spot_warning",
  "lane_departure_warning", "backup_camera", "curtain_airbags"];

const EMPTY: CrashInput = {
  collision_type: "", first_harmful_event: "tree", body_type: "", make: "", model_year: null,
  driver_age: null, speed_limit_mph: null, hour: null, month: null,
  vehicles_in_crash: 2, occupants: 1, crash_year: 2024,
};

type Status = "idle" | "loading" | "done" | "error";

/** Form values -> request body. Blank fields are left out so the API applies its defaults. */
function toRequest(values: CrashInput): CrashInput {
  const body: CrashInput = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === "" || v === null) continue;
    body[k] = v;
  }
  // "What was hit" only applies when the crash wasn't with another moving vehicle.
  if (values.collision_type !== NOT_WITH_VEHICLE) body.first_harmful_event = "motor_vehicle";
  return body;
}

/** Shows `true` once `active` has been on for `ms` milliseconds (cold-start hint). */
function useSlow(active: boolean, ms = SLOW_AFTER_MS) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setSlow(true), ms);
    return () => { clearTimeout(t); setSlow(false); };
  }, [active, ms]);
  return active && slow;
}

export default function Home() {
  // ---- options (fill the dropdowns from the live API) ----------------------
  const [options, setOptions] = useState<Options | null>(null);
  const [optionsError, setOptionsError] = useState<ApiError | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const optionsSlow = useSlow(optionsLoading);

  const [optionsAttempt, setOptionsAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getOptions()
      .then((opts) => { if (!cancelled) setOptions(opts); })
      .catch((err) => { if (!cancelled) setOptionsError(err as ApiError); })
      .finally(() => { if (!cancelled) setOptionsLoading(false); });
    return () => { cancelled = true; };
  }, [optionsAttempt]);
  const loadOptions = () => {
    setOptionsError(null);
    setOptionsLoading(true);
    setOptionsAttempt((n) => n + 1);
  };

  // ---- form ----------------------------------------------------------------
  const [values, setValues] = useState<CrashInput>(EMPTY);
  const [showMore, setShowMore] = useState(false);
  const set = (field: string) => (v: string | number | null) => setValues((s) => ({ ...s, [field]: v }));

  const defaults = useMemo(() => {
    const d: CrashInput = {};
    if (options) for (const [f, spec] of Object.entries(options.choice_fields)) if (spec.default) d[f] = spec.default;
    return d;
  }, [options]);
  const current = { ...defaults, ...Object.fromEntries(Object.entries(values).filter(([, v]) => v !== "")) } as CrashInput;
  const value = (f: string) => String(values[f] ?? defaults[f] ?? "");

  const applyPreset = (preset: CrashInput) => {
    setValues({ ...EMPTY, ...preset });
    setFieldErrors({});
  };

  // ---- prediction ------------------------------------------------------------
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [whatIfRows, setWhatIfRows] = useState<WhatIfRow[]>([]);
  const [whatIfLoading, setWhatIfLoading] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const predictSlow = useSlow(status === "loading");
  const resultRef = useRef<HTMLDivElement>(null);

  const canSubmit = Boolean(values.collision_type && values.body_type) && status !== "loading" && !!options;
  const stale = status === "done" && submitted !== JSON.stringify(toRequest(current));

  async function runPrediction() {
    const body = toRequest(current);
    setStatus("loading");
    setError(null);
    setFieldErrors({});
    try {
      const res = await predict(body);
      setResult(res);
      setSubmitted(JSON.stringify(body));
      setStatus("done");
      if (window.innerWidth < 1024) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      runWhatIfs(body);
    } catch (err) {
      const e = err as ApiError;
      setError(e);
      setStatus("error");
      if (e.kind === "validation") {
        setFieldErrors(Object.fromEntries(e.fieldErrors.filter((f) => f.field).map((f) => [f.field, f.message])));
      }
    }
  }

  async function runWhatIfs(body: CrashInput) {
    const list = whatIfs(body);
    setWhatIfRows(list.map((w) => ({ label: w.label, probability: null })));
    setWhatIfLoading(true);
    const settled = await Promise.allSettled(list.map((w) => predict({ ...body, ...w.change })));
    setWhatIfRows(list.map((w, i) => {
      const s = settled[i];
      return s.status === "fulfilled"
        ? { label: w.label, probability: s.value.severe_probability }
        : { label: w.label, probability: null, failed: true };
    }));
    setWhatIfLoading(false);
  }

  const choices = (field: string) =>
    (options?.choice_fields[field]?.options ?? []).map((o) => ({ value: o, label: optionLabel(field, o) }));

  const disabled = !options;

  // Sections rise in gently on first load (skipped when reduced motion is on).
  const reduceMotion = useReducedMotion();
  const fadeIn = (delay: number) => reduceMotion ? {} : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] as const },
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <motion.header {...fadeIn(0)}>
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-primary">DTSC 3602 · Group 3</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Crash Severity Estimator</h1>
          <p className="mt-3 text-base text-muted-foreground">
            Describe a vehicle in a crash and see the estimated chance that someone in it is killed or
            seriously injured. The model learned from about 353,000 vehicles in police-reported crashes
            (NHTSA CRSS, 2020–2024).
          </p>
        </div>
        <RoadScene className="mt-6" />
      </motion.header>

      {/* Options loading / error ------------------------------------------------ */}
      {optionsLoading && optionsSlow && (
        <div role="status" className="mt-6 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <Loader2 className="size-4 animate-spin text-primary" />
          Waking up the model. The first visit after a quiet period can take up to 30 seconds.
        </div>
      )}
      {optionsError && (
        <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4" /> {optionsError.message}
          </span>
          <Button variant="outline" size="sm" onClick={loadOptions}><RotateCcw /> Try again</Button>
        </div>
      )}

      {/* Presets ------------------------------------------------------------------ */}
      <motion.section aria-label="Example scenarios" className="mt-8" {...fadeIn(0.1)}>
        <p className="text-sm font-medium">Try an example</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.name} variant="outline" size="sm" disabled={disabled} onClick={() => applyPreset(p.values)}>
              {p.name}
            </Button>
          ))}
        </div>
      </motion.section>

      <motion.div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start" {...fadeIn(0.2)}>
        {/* Form ------------------------------------------------------------------ */}
        <form
          className="rounded-xl border border-border bg-card p-5 sm:p-6"
          onSubmit={(e) => { e.preventDefault(); if (canSubmit) runPrediction(); }}
        >
          {optionsLoading && !options ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : (
            <fieldset disabled={disabled} className="flex flex-col gap-6">
              <div>
                <h2 className="text-base font-semibold">The crash</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <SelectField id="collision_type" label={FIELD_LABELS.collision_type} value={value("collision_type")}
                    choices={choices("collision_type")} onChange={set("collision_type")} placeholder="Choose…"
                    error={fieldErrors.collision_type} />
                  {values.collision_type === NOT_WITH_VEHICLE && (
                    <SelectField id="first_harmful_event" label={FIELD_LABELS.first_harmful_event}
                      value={value("first_harmful_event")}
                      choices={choices("first_harmful_event").filter((c) => c.value !== "motor_vehicle")}
                      onChange={set("first_harmful_event")} error={fieldErrors.first_harmful_event} />
                  )}
                  <SelectField id="speed_limit_mph" label={FIELD_LABELS.speed_limit_mph}
                    value={values.speed_limit_mph === null ? "" : String(values.speed_limit_mph)}
                    choices={SPEED_LIMITS.map((s) => ({ value: String(s), label: `${s} mph` }))}
                    onChange={(v) => set("speed_limit_mph")(v === "" ? null : Number(v))}
                    placeholder="Unknown" error={fieldErrors.speed_limit_mph} />
                  <SelectField id="hour" label={FIELD_LABELS.hour}
                    value={values.hour === null ? "" : String(values.hour)}
                    choices={Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: hourLabel(h) }))}
                    onChange={(v) => set("hour")(v === "" ? null : Number(v))} placeholder="Unknown"
                    error={fieldErrors.hour} />
                  {["area", "light", "weather"].map((f) => (
                    <SelectField key={f} id={f} label={FIELD_LABELS[f]} value={value(f)} choices={choices(f)}
                      onChange={set(f)} error={fieldErrors[f]} />
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-base font-semibold">Vehicle and driver</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <SelectField id="body_type" label={FIELD_LABELS.body_type} value={value("body_type")}
                    choices={choices("body_type")} onChange={set("body_type")} placeholder="Choose…"
                    error={fieldErrors.body_type} />
                  <SelectField id="make" label={FIELD_LABELS.make} value={String(values.make ?? "")}
                    choices={(options?.makes ?? []).map((m) => ({ value: m, label: m }))}
                    onChange={set("make")} placeholder="Unknown" error={fieldErrors.make} />
                  <NumberField id="model_year" label={FIELD_LABELS.model_year} value={values.model_year as number | null}
                    onChange={set("model_year")} min={1950} max={2025} placeholder="e.g. 2018"
                    error={fieldErrors.model_year} />
                  <NumberField id="driver_age" label={FIELD_LABELS.driver_age} value={values.driver_age as number | null}
                    onChange={set("driver_age")} min={14} max={100} placeholder="e.g. 35"
                    error={fieldErrors.driver_age} />
                  {MAIN_CHOICES.filter((f) => f !== "body_type" && !["area", "light", "weather"].includes(f)).map((f) => (
                    <SelectField key={f} id={f} label={FIELD_LABELS[f]} value={value(f)} choices={choices(f)}
                      onChange={set(f)} error={fieldErrors[f]} />
                  ))}
                </div>
              </div>

              <div>
                <button type="button" onClick={() => setShowMore((s) => !s)} aria-expanded={showMore}
                  className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                  <ChevronDown className={`size-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
                  {showMore ? "Fewer details" : "More details (optional)"}
                </button>
                {showMore && (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <NumberField id="vehicles_in_crash" label={FIELD_LABELS.vehicles_in_crash}
                      value={values.vehicles_in_crash as number | null} onChange={set("vehicles_in_crash")}
                      min={1} max={15} error={fieldErrors.vehicles_in_crash} />
                    <NumberField id="occupants" label={FIELD_LABELS.occupants} value={values.occupants as number | null}
                      onChange={set("occupants")} min={1} max={60} error={fieldErrors.occupants} />
                    <SelectField id="month" label={FIELD_LABELS.month}
                      value={values.month === null ? "" : String(values.month)}
                      choices={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
                      onChange={(v) => set("month")(v === "" ? null : Number(v))} placeholder="Unknown"
                      error={fieldErrors.month} />
                    {MORE_CHOICES.map((f) => (
                      <SelectField key={f} id={f} label={FIELD_LABELS[f]} value={value(f)} choices={choices(f)}
                        onChange={set(f)} error={fieldErrors[f]} />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
                <Button type="submit" size="lg" disabled={!canSubmit} className="min-w-40">
                  {status === "loading" ? <><Loader2 className="animate-spin" /> Estimating…</> : "Estimate risk"}
                </Button>
                <Button type="button" variant="ghost" size="lg" onClick={() => applyPreset({})}>Clear</Button>
                {!values.collision_type || !values.body_type ? (
                  <span className="text-xs text-muted-foreground">Choose a collision type and vehicle type to start.</span>
                ) : null}
              </div>
            </fieldset>
          )}
        </form>

        {/* Result ---------------------------------------------------------------- */}
        <section ref={resultRef} aria-live="polite" className="scroll-mt-6 rounded-xl border border-border bg-card p-5 sm:p-6 lg:sticky lg:top-6">
          {status === "idle" && (
            <div className="flex min-h-48 flex-col justify-center text-sm text-muted-foreground">
              <p className="font-medium text-foreground">No estimate yet</p>
              <p className="mt-1">Fill in the form or pick an example, then choose <span className="font-medium">Estimate risk</span>.</p>
            </div>
          )}

          {status === "loading" && (
            <DrivingLoader label={predictSlow
              ? "Waking up the model. This can take up to 30 seconds."
              : "Running the numbers…"} />
          )}

          {status === "error" && error && (
            <div role="alert" className="flex flex-col gap-3">
              <p className="flex items-center gap-2 font-medium text-destructive">
                <AlertCircle className="size-4" /> {error.message}
              </p>
              {error.kind === "validation" ? (
                <ul className="list-disc pl-5 text-sm">
                  {error.fieldErrors.map((f, i) => (
                    <li key={i}>{f.field ? <span className="font-medium">{FIELD_LABELS[f.field] ?? f.field}: </span> : null}{f.message}</li>
                  ))}
                </ul>
              ) : (
                <Button variant="outline" size="sm" className="self-start" onClick={runPrediction}>
                  <RotateCcw /> Try again
                </Button>
              )}
            </div>
          )}

          {status === "done" && result && (
            <div className="flex flex-col gap-6">
              {stale && (
                <p className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
                  You changed the inputs. Choose Estimate risk to update.
                </p>
              )}
              <ResultSummary key={submitted} probability={result.severe_probability} baseRate={result.base_rate} />
              <WhatIfChart key={`w-${submitted}`} rows={whatIfRows} base={result.severe_probability} loading={whatIfLoading} />
            </div>
          )}
        </section>
      </motion.div>

      <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        <p>
          Gradient-boosted trees trained on NHTSA Crash Report Sampling System data (2020–2024). Estimates
          describe patterns in police-reported crashes and are not a safety rating for any vehicle.
          Cross-validated PR-AUC 0.41.
        </p>
        <p className="mt-1">
          API: <a className="underline underline-offset-2 hover:text-foreground" href={`${API_URL}/docs`}>{API_URL.replace("https://", "")}/docs</a>
        </p>
      </footer>
    </main>
  );
}
