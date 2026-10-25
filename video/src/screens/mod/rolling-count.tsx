import { enter } from "../../lib/motion";

/** The count changes to `value` on frame `at`. */
export type CountStep = { at: number; value: number };

/** The value showing at `frame`, the one before it, and how far the roll between them has run (0–1). */
export function countAt(frame: number, initial: number, steps: CountStep[], duration: number) {
  let value = initial;
  let prev = initial;
  let at = Number.NEGATIVE_INFINITY;
  for (const step of steps) {
    if (frame < step.at) break;
    prev = value;
    value = step.value;
    at = step.at;
  }
  const t = Number.isFinite(at) ? enter(frame, at, duration) : 1;
  return { value, prev, t };
}

/**
 * Digits that roll to the new count inside their own line: the old number leaves upwards and the new
 * one rises in when the count grows, and the other way round when it shrinks.
 */
export function RollingCount({
  frame,
  initial = 0,
  steps,
  duration = 14,
  line = "1em",
  rollFromZero = true,
}: {
  frame: number;
  initial?: number;
  steps: CountStep[];
  duration?: number;
  /** Height of one line of digits (CSS length). */
  line?: string;
  /** False where the count is hidden at zero (the bell): the first number then shows at once. */
  rollFromZero?: boolean;
}) {
  const { value, prev, t } = countAt(frame, initial, steps, duration);
  const rolling = t < 1 && value !== prev && (rollFromZero || prev !== 0);
  const dir = value >= prev ? 1 : -1;
  return (
    <span className="relative inline-block overflow-hidden align-top tabular-nums" style={{ height: line, lineHeight: line }}>
      <span
        className="block"
        style={rolling ? { transform: `translateY(calc(${dir * (1 - t)} * ${line}))`, opacity: Math.min(1, t * 1.6) } : undefined}
      >
        {value}
      </span>
      {rolling && (
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 block text-center"
          style={{ transform: `translateY(calc(${-dir * t} * ${line}))`, opacity: 1 - t }}
        >
          {prev}
        </span>
      )}
    </span>
  );
}
