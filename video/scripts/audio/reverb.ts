/**
 * Stereo hall: pre-delay, four allpass diffusers per side, then an 8-line feedback delay
 * network with a Hadamard mixing matrix, per-line high-frequency damping and slow
 * delay modulation so long tails never ring metallic.
 */
import { SR, type Stereo, stereo } from "./dsp.ts";

export type ReverbOptions = { rt60: number; predelayMs: number; damping: number; size: number };

const LINE_MS = [37.1, 41.3, 47.9, 53.3, 59.7, 67.1, 73.9, 81.7];
const DIFFUSER_MS = [4.77, 3.59, 12.73, 9.31];
const OUT_L = [1, -1, 1, -1, 1, -1, 1, -1];
const OUT_R = [1, 1, -1, -1, 1, 1, -1, -1];
const IN_SIGN = [1, 1, -1, 1, -1, -1, 1, -1];
const SIZE = 16384;
const MASK = SIZE - 1;

class Allpass {
  buf: Float32Array;
  i = 0;
  gain: number;

  constructor(samples: number, gain: number) {
    this.buf = new Float32Array(samples);
    this.gain = gain;
  }

  process(x: number): number {
    const delayed = this.buf[this.i];
    const y = -this.gain * x + delayed;
    this.buf[this.i] = x + this.gain * y;
    this.i = this.i + 1 === this.buf.length ? 0 : this.i + 1;
    return y;
  }
}

export function reverb(input: Stereo, o: ReverbOptions): Stereo {
  const n = input.l.length;
  const out = stereo(n);
  const pre = Math.round((o.predelayMs / 1000) * SR);
  const diffL = DIFFUSER_MS.map((ms) => new Allpass(Math.round((ms * SR) / 1000), 0.62));
  const diffR = DIFFUSER_MS.map((ms) => new Allpass(Math.round((ms * 1.037 * SR) / 1000), 0.62));
  const lines = LINE_MS.map(() => new Float32Array(SIZE));
  const base = LINE_MS.map((ms) => (ms * o.size * SR) / 1000);
  const gain = base.map((len) => Math.pow(10, (-3 * len) / (o.rt60 * SR)));
  const rate = LINE_MS.map((_, i) => 0.07 + 0.031 * i);
  const depth = LINE_MS.map((_, i) => 3 + (i % 3));
  const delay = new Float64Array(8);
  const lp = new Float64Array(8);
  const y = new Float64Array(8);
  const norm = 1 / Math.sqrt(8);
  const damp = o.damping;
  let w = 0;

  for (let k = 0; k < n; k++) {
    if ((k & 15) === 0) {
      const t = k / SR;
      for (let i = 0; i < 8; i++) delay[i] = base[i] + depth[i] * Math.sin(2 * Math.PI * rate[i] * t + i * 1.3);
    }
    const src = k - pre;
    let inL = src >= 0 ? input.l[src] : 0;
    let inR = src >= 0 ? input.r[src] : 0;
    for (let d = 0; d < 4; d++) {
      inL = diffL[d].process(inL);
      inR = diffR[d].process(inR);
    }

    let outL = 0;
    let outR = 0;
    for (let i = 0; i < 8; i++) {
      const pos = w - delay[i];
      const j = Math.floor(pos);
      const frac = pos - j;
      const line = lines[i];
      const a = line[j & MASK];
      const v = a + (line[(j + 1) & MASK] - a) * frac;
      lp[i] += (1 - damp) * (v - lp[i]);
      y[i] = lp[i];
      outL += y[i] * OUT_L[i];
      outR += y[i] * OUT_R[i];
    }
    hadamard8(y);
    for (let i = 0; i < 8; i++) {
      const inject = (i < 4 ? inL : inR) * IN_SIGN[i] * 0.5;
      lines[i][w & MASK] = gain[i] * y[i] * norm + inject;
    }
    out.l[k] = outL * 0.35;
    out.r[k] = outR * 0.35;
    w++;
  }
  return out;
}

/** In-place fast Walsh–Hadamard transform of 8 values (unnormalised). */
function hadamard8(h: Float64Array): void {
  for (let len = 1; len < 8; len <<= 1) {
    for (let i = 0; i < 8; i += len << 1) {
      for (let j = i; j < i + len; j++) {
        const a = h[j];
        const b = h[j + len];
        h[j] = a + b;
        h[j + len] = a - b;
      }
    }
  }
}
