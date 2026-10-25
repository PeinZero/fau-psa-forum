/** Shared DSP building blocks for the score and the UI sounds. */
export const SR = 48000;

export type Stereo = { l: Float32Array; r: Float32Array };

export function stereo(length: number): Stereo {
  return { l: new Float32Array(length), r: new Float32Array(length) };
}

export const midiHz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);
export const toDb = (gain: number): number => 20 * Math.log10(Math.max(gain, 1e-12));
export const fromDb = (decibels: number): number => Math.pow(10, decibels / 20);
export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/** 0 → 1 raised-cosine ramp. */
export const smooth = (x: number): number => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1));

/** Equal-power pan: -1 left, 0 centre, 1 right. */
export function panGains(pan: number): [number, number] {
  const a = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
}

/** Piecewise-linear automation over [x, value] breakpoints (sorted by x). */
export function curve(points: [number, number][]): (x: number) => number {
  return (x) => {
    if (x <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [x1, y1] = points[i];
      if (x <= x1) {
        const [x0, y0] = points[i - 1];
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
      }
    }
    return points[points.length - 1][1];
  };
}

/** Adds a mono source into a stereo bus at a sample offset. */
export function addPanned(bus: Stereo, src: ArrayLike<number>, offset: number, gain: number, pan: number): void {
  const [gl, gr] = panGains(pan);
  const end = Math.min(src.length, bus.l.length - offset);
  for (let k = Math.max(0, -offset); k < end; k++) {
    const x = src[k] * gain;
    bus.l[offset + k] += x * gl;
    bus.r[offset + k] += x * gr;
  }
}

export function mixInto(bus: Stereo, src: Stereo, gain: number): void {
  for (let k = 0; k < bus.l.length; k++) {
    bus.l[k] += src.l[k] * gain;
    bus.r[k] += src.r[k] * gain;
  }
}

export function scale(bus: Stereo, gain: number): void {
  for (let k = 0; k < bus.l.length; k++) {
    bus.l[k] *= gain;
    bus.r[k] *= gain;
  }
}

/** RMS of both channels between two sample indices. */
export function rms(bus: Stereo, from = 0, to = bus.l.length): number {
  let sum = 0;
  const a = Math.max(0, Math.floor(from));
  const b = Math.min(bus.l.length, Math.floor(to));
  for (let k = a; k < b; k++) sum += bus.l[k] * bus.l[k] + bus.r[k] * bus.r[k];
  return Math.sqrt(sum / Math.max(1, 2 * (b - a)));
}

export type FilterKind = "lowpass" | "highpass" | "bandpass" | "peak" | "lowshelf" | "highshelf";

/** RBJ cookbook biquad, transposed direct form II. */
export class Biquad {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  z1 = 0;
  z2 = 0;

  static of(kind: FilterKind, freq: number, q = Math.SQRT1_2, gainDb = 0): Biquad {
    const w = (2 * Math.PI * Math.min(freq, SR * 0.49)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    const s = 2 * Math.sqrt(A) * alpha;
    let c: [number, number, number, number, number, number];
    switch (kind) {
      case "lowpass":
        c = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
        break;
      case "highpass":
        c = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2, 1 + alpha, -2 * cos, 1 - alpha];
        break;
      case "bandpass":
        c = [alpha, 0, -alpha, 1 + alpha, -2 * cos, 1 - alpha];
        break;
      case "peak":
        c = [1 + alpha * A, -2 * cos, 1 - alpha * A, 1 + alpha / A, -2 * cos, 1 - alpha / A];
        break;
      case "lowshelf":
        c = [
          A * (A + 1 - (A - 1) * cos + s),
          2 * A * (A - 1 - (A + 1) * cos),
          A * (A + 1 - (A - 1) * cos - s),
          A + 1 + (A - 1) * cos + s,
          -2 * (A - 1 + (A + 1) * cos),
          A + 1 + (A - 1) * cos - s,
        ];
        break;
      case "highshelf":
        c = [
          A * (A + 1 + (A - 1) * cos + s),
          -2 * A * (A - 1 + (A + 1) * cos),
          A * (A + 1 + (A - 1) * cos - s),
          A + 1 - (A - 1) * cos + s,
          2 * (A - 1 - (A + 1) * cos),
          A + 1 - (A - 1) * cos - s,
        ];
        break;
    }
    return Biquad.raw(c[0] / c[3], c[1] / c[3], c[2] / c[3], c[4] / c[3], c[5] / c[3]);
  }

  static raw(b0: number, b1: number, b2: number, a1: number, a2: number): Biquad {
    const f = new Biquad();
    f.b0 = b0;
    f.b1 = b1;
    f.b2 = b2;
    f.a1 = a1;
    f.a2 = a2;
    return f;
  }

  process(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }

  run(buf: Float32Array | Float64Array): void {
    for (let k = 0; k < buf.length; k++) buf[k] = this.process(buf[k]);
  }
}

/** Runs a fresh copy of the same filter over each channel. */
export function filterStereo(bus: Stereo, make: () => Biquad): void {
  make().run(bus.l);
  make().run(bus.r);
}

/** Zero-delay-feedback state-variable filter (stable under fast cutoff moves). */
export class Svf {
  ic1 = 0;
  ic2 = 0;
  a1 = 1;
  a2 = 0;
  a3 = 0;
  k = Math.SQRT2;
  /** Band-pass output of the last step, unity gain at the centre frequency. */
  band = 0;
  /** High-pass output of the last step. */
  high = 0;

  set(freq: number, q: number): void {
    const g = Math.tan((Math.PI * clamp(freq, 20, SR * 0.45)) / SR);
    this.k = 1 / q;
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }

  /** One step; returns the low-pass output and leaves the band- and high-pass in `band` and `high`. */
  lowpass(x: number): number {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.band = this.k * v1;
    this.high = x - this.k * v1 - v2;
    return v2;
  }
}

/** Raised-cosine fade at both ends so a buffer never starts or stops on a step. */
export function taper(buf: Float32Array | Float64Array, inSamples: number, outSamples: number): void {
  const n = buf.length;
  for (let k = 0; k < Math.min(inSamples, n); k++) buf[k] *= smooth(k / inSamples);
  for (let k = 0; k < Math.min(outSamples, n); k++) buf[n - 1 - k] *= smooth(k / outSamples);
}
