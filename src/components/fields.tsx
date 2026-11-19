"use client";

import { cn } from "@/lib/utils";

type Choice = { value: string; label: string };

const control =
  "h-9 w-full rounded-md border border-input bg-card px-2.5 text-sm text-foreground outline-none " +
  "transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 " +
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20 disabled:opacity-60";

function FieldShell({ id, label, hint, error, children }: {
  id: string; label: string; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function SelectField({ id, label, value, choices, onChange, placeholder, hint, error, disabled }: {
  id: string; label: string; value: string; choices: Choice[]; onChange: (v: string) => void;
  placeholder?: string; hint?: string; error?: string; disabled?: boolean;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <select
        id={id}
        className={cn(control, !value && "text-muted-foreground")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {choices.map((c) => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>
    </FieldShell>
  );
}

export function NumberField({ id, label, value, onChange, min, max, placeholder, hint, error, disabled }: {
  id: string; label: string; value: number | null; onChange: (v: number | null) => void;
  min: number; max: number; placeholder?: string; hint?: string; error?: string; disabled?: boolean;
}) {
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        className={control}
        value={value ?? ""}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        disabled={disabled}
      />
    </FieldShell>
  );
}
