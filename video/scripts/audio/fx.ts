/** Mix tools: the kick-keyed pump, gates, filter sweeps, a ping-pong delay, saturation and mono bass. */
import { Biquad, SR, Svf, type Stereo, fromDb, smooth, stereo } from "./dsp.ts";

export type PumpShape = { depthDb: number; attackMs: number; holdMs: number; releaseMs: number; lookaheadMs: number };

/**
 * Sidechain gain computed from the kick grid instead of a detector, so every duck is identical
 * and lands a few milliseconds before the kick (the look-ahead) for a tight pump.
 */
export function pumpCurve(length: number, triggers: number[], s: PumpShape): Float32Array {
  const g = new Float32Array(length).fill(1);
  const depth = 1 - fromDb(s.depthDb);
  const att = Math.max(1, Math.round((s.attackMs / 1000) * SR));
  const hold = Math.round((s.holdMs / 1000) * SR);
  const rel = Math.max(1, Math.round((s.releaseMs / 1000) * SR));
  const look = Math.round((s.lookaheadMs / 1000) * SR);
  for (const t of triggers) {
    const start = Math.round(t * SR) - look;
    for (let i = 0; i < att + hold + rel; i++) {
      const k = start + i;
      if (k < 0 || k >= length) continue;
      const duck = i < att ? smooth(i / att) : i < att + hold ? 1 : 1 - smooth((i - att - hold) / rel);
      const v = 1 - depth * duck;
      if (v < g[k]) g[k] = v;
    }
  }
  return g;
}

/** Rhythmic gate: each trigger opens fast and decays to `floor` (the chat's tense eighth-note pulse). */
export function gateCurve(length: number, triggers: number[], o: { attackMs: number; decay: number; floor: number; from: number; to: number }): Float32Array {
  const g = new Float32Array(length).fill(1);
  const a = Math.round(o.from * SR);
  const b = Math.min(length, Math.round(o.to * SR));
  for (let k = a; k < b; k++) g[k] = o.floor;
  const att = Math.max(1, Math.round((o.attackMs / 1000) * SR));
  for (let n = 0; n < triggers.length; n++) {
    const start = Math.round(triggers[n] * SR);
    const end = Math.min(b, n + 1 < triggers.length ? Math.round(triggers[n + 1] * SR) : b);
    // Each opening starts from wherever the last one had decayed to, so the gate never steps.
    const from = start > 0 ? g[start - 1] : o.floor;
    for (let k = start; k < end; k++) {
      const i = k - start;
      const open = o.floor + (1 - o.floor) * Math.exp(-Math.max(0, i - att) / (o.decay * SR));
      g[k] = i < att ? from + (open - from) * smooth(i / att) : open;
    }
  }
  // After the last opening the gate holds where it stopped instead of jumping back open.
  for (let k = b; k < length; k++) g[k] = b > 0 ? g[b - 1] : 1;
  return g;
}

/** Gain automation from [seconds, dB] breakpoints, eased between points. */
export function dbCurve(length: number, points: [number, number][]): Float32Array {
  const g = new Float32Array(length);
  let j = 0;
  for (let k = 0; k < length; k++) {
    const t = k / SR;
    while (j + 1 < points.length && t >= points[j + 1][0]) j++;
    let db: number;
    if (t <= points[0][0]) db = points[0][1];
    else if (j + 1 >= points.length) db = points[points.length - 1][1];
    else {
      const [t0, d0] = points[j];
      const [t1, d1] = points[j + 1];
      db = d0 + (d1 - d0) * smooth((t - t0) / (t1 - t0));
    }
    g[k] = fromDb(db);
  }
  return g;
}

export function applyGain(st: Stereo, g: Float32Array): void {
  for (let k = 0; k < st.l.length; k++) {
    st.l[k] *= g[k];
    st.r[k] *= g[k];
  }
}

export function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let k = 0; k < a.length; k++) out[k] = a[k] * b[k];
  return out;
}

/**
 * Mutes [from, to) seconds: the breath before a drop. It ramps out just before `from` and back in
 * just before `to`, so the band is fully open again on the downbeat and nothing snaps back in.
 */
export function muteCurve(length: number, spans: [number, number][], rampMs = 6): Float32Array {
  const g = new Float32Array(length).fill(1);
  const ramp = Math.round((rampMs / 1000) * SR);
  for (const [from, to] of spans) {
    const a = Math.round(from * SR);
    const b = Math.round(to * SR);
    for (let k = Math.max(0, a - ramp); k < Math.min(length, b); k++) {
      const out = k < a ? 1 - smooth((k - (a - ramp)) / ramp) : 0;
      const back = k >= b - ramp ? smooth((k - (b - ramp)) / ramp) : 0;
      g[k] = Math.min(g[k], Math.max(out, back));
    }
  }
  return g;
}

/** Resonant low-pass whose cutoff follows a function of time; `stages` 2 gives 24 dB/oct. */
export function lowpassSweep(st: Stereo, cutoff: (t: number) => number, q: number, stages = 1): void {
  for (const ch of [st.l, st.r]) {
    const filters = Array.from({ length: stages }, () => new Svf());
    for (let k = 0; k < ch.length; k++) {
      if ((k & 31) === 0) {
        const f = cutoff(k / SR);
        for (const svf of filters) svf.set(f, q);
      }
      let x = ch[k];
      for (const svf of filters) x = svf.lowpass(x);
      ch[k] = x;
    }
  }
}

/** Static EQ stage on both channels. */
export function eq(st: Stereo, make: () => Biquad[]): void {
  for (const ch of [st.l, st.r]) {
    const chain = make();
    for (let k = 0; k < ch.length; k++) {
      let x = ch[k];
      for (const f of chain) x = f.process(x);
      ch[k] = x;
    }
  }
}

export function eqMono(x: Float32Array, make: () => Biquad[]): void {
  const chain = make();
  for (let k = 0; k < x.length; k++) {
    let y = x[k];
    for (const f of chain) y = f.process(y);
    x[k] = y;
  }
}

/** Ping-pong echo of the mono sum, each repeat filtered darker and thinner. Returns the wet signal. */
export function pingPong(input: Stereo, seconds: number, feedback: number, hp: number, lp: number): Stereo {
  const n = input.l.length;
  const out = stereo(n);
  const d = Math.round(seconds * SR);
  const hpf = Biquad.of("highpass", hp, 0.7);
  const lpf = Biquad.of("lowpass", lp, 0.7);
  for (let k = d; k < n; k++) {
    const fed = 0.5 * (input.l[k - d] + input.r[k - d]) + feedback * out.r[k - d];
    out.l[k] = lpf.process(hpf.process(fed));
    out.r[k] = feedback * out.l[k - d];
  }
  return out;
}

/** Soft saturation normalised so a full-scale sine stays at full scale. */
export function saturate(x: Float32Array, drive: number): void {
  const norm = Math.tanh(drive);
  for (let k = 0; k < x.length; k++) x[k] = Math.tanh(drive * x[k]) / norm;
}

/** High-passes the side signal so everything below `freq` is mono. */
export function monoBelow(st: Stereo, freq: number): void {
  const h1 = Biquad.of("highpass", freq, Math.SQRT1_2);
  const h2 = Biquad.of("highpass", freq, Math.SQRT1_2);
  for (let k = 0; k < st.l.length; k++) {
    const m = 0.5 * (st.l[k] + st.r[k]);
    const s = h2.process(h1.process(0.5 * (st.l[k] - st.r[k])));
    st.l[k] = m + s;
    st.r[k] = m - s;
  }
}

export function monoToStereo(x: Float32Array): Stereo {
  return { l: Float32Array.from(x), r: Float32Array.from(x) };
}
