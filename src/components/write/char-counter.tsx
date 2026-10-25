import { cn } from "@/components/ui/cn";

export type CounterTone = "subtle" | "warning" | "danger";

/** Counters stay out of the way until a writer is close enough to the limit to care. */
export const COUNTER_SHOW_AT = 0.8;
const WARN_AT = 0.95;

export function counterState(length: number, max: number): { remaining: number; tone: CounterTone } | null {
  if (length < max * COUNTER_SHOW_AT) return null;
  const remaining = Math.max(0, max - length);
  const tone: CounterTone = remaining === 0 ? "danger" : length >= max * WARN_AT ? "warning" : "subtle";
  return { remaining, tone };
}

export function counterLabel(remaining: number): string {
  return remaining === 1 ? "1 character left" : `${remaining.toLocaleString("en")} characters left`;
}

const tones: Record<CounterTone, string> = {
  subtle: "text-subtle",
  warning: "text-warning",
  danger: "text-danger",
};

/** Remaining characters, shown only near `max`; renders nothing before that. */
export function CharCounter({ length, max, id, className }: { length: number; max: number; id?: string; className?: string }) {
  const state = counterState(length, max);
  if (!state) return null;
  return (
    <span
      id={id}
      className={cn("shrink-0 animate-fade-in text-meta tabular-nums", tones[state.tone], className)}
    >
      {counterLabel(state.remaining)}
    </span>
  );
}
