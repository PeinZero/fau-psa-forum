/** Seeded PRNG (mulberry32): every render of the score is bit-identical. */
export type Rng = () => number;

export function rng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Folds numbers into one 32-bit seed so each note draws from its own stream. */
export function seedOf(...parts: number[]): number {
  let h = 0x811c9dc5;
  for (const part of parts) {
    h ^= Math.round(part * 1000) | 0;
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Uniform in [-1, 1). */
export const bipolar = (r: Rng): number => r() * 2 - 1;
