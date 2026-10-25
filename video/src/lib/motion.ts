import { Easing, interpolate } from "remotion";

import { FPS } from "./timeline.ts";

/** The site's entrance curve; every transition in the film uses it. */
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
/** Slow camera drifts and cursor travel: gentle on both ends. */
export const easeInOut = Easing.bezier(0.45, 0, 0.2, 1);

export const CLAMP = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 between `start` and `start + duration`, eased. */
export function enter(frame: number, start: number, duration = 24, easing = easeOut): number {
  return interpolate(frame, [start, start + duration], [0, 1], { ...CLAMP, easing });
}

/** 1 → 0 between `start` and `start + duration`, eased. */
export function exit(frame: number, start: number, duration = 24, easing = easeOut): number {
  return 1 - enter(frame, start, duration, easing);
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Typing runs at about six characters a second. */
export const CPS = 6;

/** Frame on which character `i` (0-based) appears. */
export function keyFrame(i: number, start: number, cps = CPS): number {
  return start + Math.ceil((i * FPS) / cps);
}

export function typedCount(text: string, frame: number, start: number, cps = CPS): number {
  let count = 0;
  while (count < text.length && keyFrame(count, start, cps) <= frame) count++;
  return count;
}

export function typed(text: string, frame: number, start: number, cps = CPS): string {
  return text.slice(0, typedCount(text, frame, start, cps));
}

/** First frame on which the whole text is visible. */
export function typingEnd(text: string, start: number, cps = CPS): number {
  return keyFrame(text.length - 1, start, cps);
}

/** About 1.5 s: the hold after every key action. */
export const HOLD = 45;
/** On-screen text stays at least this long. */
export const MIN_TEXT = 60;
