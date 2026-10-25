"use client";

import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

export type Choice = { value: string; label: string };

/** A short single choice as a row of native radios styled as chips, e.g. city or badge; wraps on phones. */
export function ChoiceGroup({
  name,
  legend,
  hint,
  value,
  options,
  onChange,
  describedBy,
  invalid,
}: {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  value: string;
  options: readonly Choice[];
  onChange: (value: string) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5" aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <legend className="mb-1.5 text-meta font-medium text-foreground">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "relative inline-flex min-h-8 cursor-pointer select-none items-center rounded-full border border-border px-3.5 text-meta font-medium",
              "text-muted transition-[background-color,border-color,color] duration-150 ease-out",
              "hover:border-border-strong/60 hover:bg-surface-hover hover:text-foreground",
              "has-checked:border-accent/50 has-checked:bg-accent-soft has-checked:text-foreground",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
              "pointer-coarse:min-h-11",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
      {hint}
    </fieldset>
  );
}
