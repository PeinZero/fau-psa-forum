/** ITU-R BS.1770-4 loudness (K-weighting, 400 ms gated blocks) and a 4× true-peak meter. */
import { Biquad, SR, type Stereo, toDb } from "./dsp.ts";

/** Per-sample K-weighted power summed over both channels (channel weight 1 for L and R). */
export function kPower(st: Stereo): Float64Array {
  const power = new Float64Array(st.l.length);
  for (const ch of [st.l, st.r]) {
    // The standard's 48 kHz coefficients: head-related shelf, then the RLB high-pass.
    const shelf = Biquad.raw(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585);
    const rlb = Biquad.raw(1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621);
    for (let k = 0; k < ch.length; k++) {
      const y = rlb.process(shelf.process(ch[k]));
      power[k] += y * y;
    }
  }
  return power;
}

const lufs = (meanPower: number): number => -0.691 + 10 * Math.log10(Math.max(meanPower, 1e-20));

/** Mean power over [from, to) samples. */
function meanPower(prefix: Float64Array, from: number, to: number): number {
  return (prefix[to] - prefix[from]) / Math.max(1, to - from);
}

export type Loudness = {
  integrated: number;
  /** Ungated loudness of a sample range: what a section sounds like on its own. */
  range: (from: number, to: number) => number;
  /** Highest 3 s short-term loudness. */
  maxShortTerm: number;
};

export function loudness(st: Stereo): Loudness {
  const power = kPower(st);
  const prefix = new Float64Array(power.length + 1);
  for (let k = 0; k < power.length; k++) prefix[k + 1] = prefix[k] + power[k];

  const block = Math.round(0.4 * SR);
  const hop = Math.round(0.1 * SR);
  const blocks: number[] = [];
  for (let s = 0; s + block <= power.length; s += hop) blocks.push(meanPower(prefix, s, s + block));
  const aboveAbsolute = blocks.filter((p) => lufs(p) > -70);
  const relGate = lufs(aboveAbsolute.reduce((a, b) => a + b, 0) / Math.max(1, aboveAbsolute.length)) - 10;
  const gated = aboveAbsolute.filter((p) => lufs(p) > relGate);
  const integrated = lufs(gated.reduce((a, b) => a + b, 0) / Math.max(1, gated.length));

  const short = Math.round(3 * SR);
  let maxShortTerm = -Infinity;
  for (let s = 0; s + short <= power.length; s += hop) maxShortTerm = Math.max(maxShortTerm, lufs(meanPower(prefix, s, s + short)));

  return {
    integrated,
    range: (from, to) => lufs(meanPower(prefix, Math.max(0, Math.round(from)), Math.min(power.length, Math.round(to)))),
    maxShortTerm,
  };
}

const HALF = 32;

/** Kaiser-windowed sinc taps for the point `frac` of the way from sample n to n+1, over n-31..n+32. */
function interpolator(frac: number): Float64Array {
  const bessel = (x: number) => {
    let sum = 1;
    let term = 1;
    for (let k = 1; k < 30; k++) {
      term *= (x / (2 * k)) ** 2;
      sum += term;
    }
    return sum;
  };
  const beta = 9;
  const h = new Float64Array(2 * HALF);
  let dc = 0;
  for (let i = 0; i < 2 * HALF; i++) {
    const d = i - (HALF - 1) - frac;
    const sinc = d === 0 ? 1 : Math.sin(Math.PI * d) / (Math.PI * d);
    const r = d / (HALF + 0.5);
    h[i] = sinc * (Math.abs(r) < 1 ? bessel(beta * Math.sqrt(1 - r * r)) / bessel(beta) : 0);
    dc += h[i];
  }
  for (let i = 0; i < h.length; i++) h[i] /= dc;
  return h;
}

/**
 * 4x oversampled peak in dBTP, with 64-tap Kaiser-windowed sinc interpolation so the meter stays
 * flat up to 20 kHz. Points are interpolated only where a sample within two either side reaches a
 * fifth of the sample peak (14 dB down); a band-limited signal cannot overshoot that far between
 * samples except right at Nyquist, where a mix has next to no energy.
 */
export function truePeakDb(st: Stereo): number {
  const phases = [0.25, 0.5, 0.75].map(interpolator);
  let samplePeak = 0;
  for (const ch of [st.l, st.r]) for (let n = 0; n < ch.length; n++) samplePeak = Math.max(samplePeak, Math.abs(ch[n]));
  const gate = 0.2 * samplePeak;
  let peak = samplePeak;
  for (const ch of [st.l, st.r]) {
    const n = ch.length;
    for (let i = 0; i < n - 1; i++) {
      let local = 0;
      for (let j = Math.max(0, i - 2); j <= Math.min(n - 1, i + 3); j++) local = Math.max(local, Math.abs(ch[j]));
      if (local < gate) continue;
      for (const h of phases) {
        let acc = 0;
        const base = i - (HALF - 1);
        for (let k = 0; k < h.length; k++) {
          const idx = base + k;
          if (idx >= 0 && idx < n) acc += h[k] * ch[idx];
        }
        const a = Math.abs(acc);
        if (a > peak) peak = a;
      }
    }
  }
  return toDb(peak);
}
