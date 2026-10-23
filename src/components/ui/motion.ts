import type { CSSProperties } from "react";

/** Position in a list for `animate-fade-up` / `animate-fade-in`; delay is capped at 8 steps. */
export function stagger(index: number): CSSProperties {
  return { "--i": index } as CSSProperties;
}
