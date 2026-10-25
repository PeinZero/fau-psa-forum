/**
 * Drums and transitions, synthesised: kick, layered claps, snare, hats, shaker, crash, toms,
 * and the sweeps that lead into the cuts (reverse swells, the one riser, a downlifter, impacts).
 * Every sound starts on the exact sample of its beat.
 */
import { Biquad, SR, Svf, type Stereo, panGains, smooth } from "./dsp.ts";
import { bipolar, rng, seedOf } from "./rng.ts";
import { pulse, saw } from "./synth.ts";

const TAU = 2 * Math.PI;

/** Linear onset over a few samples, so a transient is sharp but never a step. */
const onset = (i: number, samples: number): number => (i < samples ? i / samples : 1);

/** Raised-cosine fade over the last `samples` of a `len`-sample sound. */
const tailFade = (i: number, len: number, samples: number): number => (i > len - samples ? smooth((len - i) / samples) : 1);

export type KickOptions = { f0: number; f1: number; pitchTau: number; decay: number; length: number; click: number; drive: number; gain: number; seed: number };

/** A sine with a fast pitch drop, saturated for harmonics a laptop can play, plus a click. */
export function kick(out: Float32Array, at: number, o: KickOptions): void {
  const start = Math.round(at * SR);
  const len = Math.min(out.length - start, Math.round(o.length * SR));
  const r = rng(seedOf(o.seed, at));
  const click = new Svf();
  click.set(3400, 0.7);
  const norm = Math.tanh(o.drive);
  const fade = Math.round(0.03 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = o.f1 + (o.f0 - o.f1) * Math.exp(-t / o.pitchTau);
    const body = Math.sin(ph) * Math.exp(-t / o.decay) * onset(i, 12);
    ph += (TAU * f) / SR;
    click.lowpass(bipolar(r) * Math.exp(-t / 0.0012));
    const y = (Math.tanh(o.drive * body) / norm) * tailFade(i, len, fade) + o.click * click.band * onset(i, 24);
    out[start + i] += y * o.gain;
  }
}

/** Layered noise claps: two filtered bursts of four flams each, with a body tone under them. */
export function clap(bus: Stereo, at: number, o: { gain: number; tail: number; bright: number; seed: number }): void {
  const r = rng(seedOf(o.seed, at));
  const start = Math.round(at * SR);
  const len = Math.min(bus.l.length - start, Math.round((0.04 + o.tail * 6) * SR));
  const layers = [
    { centre: 1150 * o.bright, q: 1.1, flams: [0, 0.0085, 0.0175, 0.027], pan: -0.22, level: 1 },
    { centre: 2050 * o.bright, q: 1.4, flams: [0.0011, 0.0097, 0.0192, 0.0281], pan: 0.22, level: 0.7 },
  ];
  for (const layer of layers) {
    const bp = Biquad.of("bandpass", layer.centre, layer.q);
    const hp = Biquad.of("highpass", 550, 0.7);
    const [gl, gr] = panGains(layer.pan);
    const last = layer.flams[layer.flams.length - 1];
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      let env = 0;
      for (const f of layer.flams) {
        if (t < f) continue;
        const tau = f === last ? o.tail : 0.0028;
        env += onset(Math.max(0, i - Math.round(f * SR)), 5) * Math.exp(-(t - f) / tau);
      }
      const y = hp.process(bp.process(bipolar(r) * env)) * tailFade(i, len, 240) * layer.level * o.gain;
      bus.l[start + i] += y * gl;
      bus.r[start + i] += y * gr;
    }
  }
  let ph = 0;
  for (let i = 0; i < Math.min(len, Math.round(0.12 * SR)); i++) {
    const t = i / SR;
    const y = Math.sin(ph) * Math.exp(-t / 0.018) * onset(i, 24) * 0.3 * o.gain;
    ph += (TAU * (190 + 40 * Math.exp(-t / 0.01))) / SR;
    bus.l[start + i] += y * Math.SQRT1_2;
    bus.r[start + i] += y * Math.SQRT1_2;
  }
}

/** Snare for builds and fills: a short tuned body and a bright noise rattle. */
export function snare(bus: Stereo, at: number, o: { gain: number; pan: number; seed: number }): void {
  const r = rng(seedOf(o.seed, at));
  const start = Math.round(at * SR);
  const len = Math.min(bus.l.length - start, Math.round(0.32 * SR));
  const bp = Biquad.of("bandpass", 2600, 0.6);
  const hp = Biquad.of("highpass", 900, 0.7);
  const [gl, gr] = panGains(o.pan);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const body = Math.sin(ph) * Math.exp(-t / 0.04) * 0.5;
    ph += (TAU * (175 + 30 * Math.exp(-t / 0.012))) / SR;
    const noise = hp.process(bp.process(bipolar(r))) * Math.exp(-t / 0.075) * 1.6;
    const y = (body + noise) * onset(i, 10) * tailFade(i, len, 480) * o.gain;
    bus.l[start + i] += y * gl;
    bus.r[start + i] += y * gr;
  }
}

/** Ratios of the six square oscillators behind a classic analogue drum machine's metal sounds. */
const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];

function metal(phases: number[], scale: number): number {
  let x = 0;
  for (let j = 0; j < METAL.length; j++) {
    const dt = (METAL[j] * scale) / SR;
    x += pulse(phases[j], dt, 0.5);
    phases[j] += dt;
    if (phases[j] >= 1) phases[j] -= 1;
  }
  return x / METAL.length;
}

/** Closed or open hat: metallic squares and noise, kept above 7 kHz so it never turns harsh. */
export function hat(bus: Stereo, at: number, o: { decay: number; gain: number; pan: number; seed: number }): void {
  const r = rng(seedOf(o.seed, at));
  const start = Math.round(at * SR);
  const len = Math.min(bus.l.length - start, Math.round((o.decay * 7 + 0.004) * SR));
  const phases = METAL.map(() => r());
  const h1 = Biquad.of("highpass", 7200, 0.7);
  const h2 = Biquad.of("highpass", 7200, 0.7);
  const peak = Biquad.of("peak", 10500, 0.8, 3);
  const [gl, gr] = panGains(o.pan);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const x = 0.55 * metal(phases, 1.6) + 0.45 * bipolar(r);
    const y = peak.process(h2.process(h1.process(x))) * Math.exp(-t / o.decay) * onset(i, 10) * tailFade(i, len, 96) * o.gain;
    bus.l[start + i] += y * gl;
    bus.r[start + i] += y * gr;
  }
}

/** Shaker: soft-edged band of noise for the 16th-note motion under the groove. */
export function shaker(bus: Stereo, at: number, o: { gain: number; pan: number; seed: number }): void {
  const r = rng(seedOf(o.seed, at));
  const start = Math.round(at * SR);
  const len = Math.min(bus.l.length - start, Math.round(0.12 * SR));
  const bp = Biquad.of("bandpass", 7400, 1.1);
  const hp = Biquad.of("highpass", 4500, 0.7);
  const [gl, gr] = panGains(o.pan);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = smooth(t / 0.006) * Math.exp(-Math.max(0, t - 0.006) / 0.022);
    const y = hp.process(bp.process(bipolar(r))) * env * tailFade(i, len, 96) * o.gain;
    bus.l[start + i] += y * gl;
    bus.r[start + i] += y * gr;
  }
}

/** Crash: decorrelated noise and metal per side, a bright strike and a long shimmer. */
export function crash(bus: Stereo, at: number, o: { gain: number; decay: number; seed: number }): void {
  const start = Math.round(at * SR);
  const len = Math.min(bus.l.length - start, Math.round(o.decay * 4 * SR));
  ["l", "r"].forEach((side, s) => {
    const ch = side === "l" ? bus.l : bus.r;
    const r = rng(seedOf(o.seed, at, s));
    const phases = METAL.map(() => r());
    const h1 = Biquad.of("highpass", 3400, 0.7);
    const h2 = Biquad.of("highpass", 3400, 0.7);
    const lp = Biquad.of("lowpass", 13000, 0.7);
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const env = (Math.exp(-t / o.decay) + 0.7 * Math.exp(-t / 0.045)) * onset(i, 15) * tailFade(i, len, Math.round(0.4 * SR));
      const x = 0.6 * bipolar(r) + 0.4 * metal(phases, 1.47 + 0.02 * s);
      ch[start + i] += lp.process(h2.process(h1.process(x))) * env * o.gain;
    }
  });
}

/** Tom for fills: a sine falling a little in pitch, with a stick tick. */
export function tom(bus: Stereo, at: number, o: { freq: number; gain: number; pan: number; seed: number }): void {
  const r = rng(seedOf(o.seed, at));
  const start = Math.round(at * SR);
  const len = Math.min(bus.l.length - start, Math.round(0.6 * SR));
  const tick = Biquad.of("bandpass", 1600, 0.8);
  const [gl, gr] = panGains(o.pan);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const body = Math.tanh(1.6 * Math.sin(ph) * Math.exp(-t / 0.15)) / Math.tanh(1.6);
    ph += (TAU * o.freq * (0.74 + 0.26 * Math.exp(-t / 0.06))) / SR;
    const y = (body + 0.35 * tick.process(bipolar(r)) * Math.exp(-t / 0.004)) * onset(i, 12) * tailFade(i, len, 960) * o.gain;
    bus.l[start + i] += y * gl;
    bus.r[start + i] += y * gr;
  }
}

/** Reverse-cymbal swell that peaks on the cut and stops there. */
export function swell(bus: Stereo, end: number, o: { length: number; gain: number; seed: number }): void {
  const stop = Math.round(end * SR);
  const len = Math.round(o.length * SR);
  const start = stop - len;
  ["l", "r"].forEach((side, s) => {
    const ch = side === "l" ? bus.l : bus.r;
    const r = rng(seedOf(o.seed, end, s));
    const phases = METAL.map(() => r());
    const hp = Biquad.of("highpass", 2200, 0.7);
    const lp = new Svf();
    for (let i = 0; i < len; i++) {
      const x = i / len;
      if ((i & 31) === 0) lp.set(3500 * Math.pow(14000 / 3500, x), 0.7);
      const env = Math.pow(x, 2.6) * tailFade(i, len, Math.round(0.004 * SR));
      const y = lp.lowpass(hp.process(0.7 * bipolar(r) + 0.3 * metal(phases, 1.47)));
      ch[start + i] += y * env * o.gain;
    }
  });
}

/** The build's riser: a band of noise and a saw stack climbing together, cut on `to`. */
export function riser(bus: Stereo, from: number, to: number, o: { midi: number; semitones: number; gain: number; seed: number }): void {
  const start = Math.round(from * SR);
  const len = Math.round((to - from) * SR);
  const cut = Math.round(0.012 * SR);
  ["l", "r"].forEach((side, s) => {
    const ch = side === "l" ? bus.l : bus.r;
    const r = rng(seedOf(o.seed, s));
    const band = new Svf();
    const tone = new Svf();
    const phases = [r(), r(), r()];
    const detune = [-14, 3, 17].map((c) => c + (s ? 5 : -5));
    for (let i = 0; i < len; i++) {
      const x = i / len;
      if ((i & 31) === 0) {
        band.set(350 * Math.pow(8500 / 350, Math.pow(x, 1.4)), 1.6);
        tone.set(500 * Math.pow(9000 / 500, Math.pow(x, 1.2)), 0.9);
      }
      band.lowpass(bipolar(r));
      const midi = o.midi + o.semitones * Math.pow(x, 1.6);
      let saws = 0;
      for (let v = 0; v < 3; v++) {
        const dt = (440 * Math.pow(2, (midi - 69) / 12 + detune[v] / 1200)) / SR;
        saws += saw(phases[v], dt);
        phases[v] += dt;
        if (phases[v] >= 1) phases[v] -= 1;
      }
      const y = band.band * 1.4 + tone.lowpass(saws / 3) * 0.5;
      const env = (0.03 + 0.97 * Math.pow(x, 2.2)) * tailFade(i, len, cut) * smooth(i / 480);
      ch[start + i] += y * env * o.gain;
    }
  });
}

/** Downlifter: a wash of noise that falls away after a hit. */
export function downlifter(bus: Stereo, at: number, o: { length: number; gain: number; seed: number }): void {
  const start = Math.round(at * SR);
  const len = Math.min(bus.l.length - start, Math.round(o.length * SR));
  ["l", "r"].forEach((side, s) => {
    const ch = side === "l" ? bus.l : bus.r;
    const r = rng(seedOf(o.seed, at, s));
    const lp = new Svf();
    const hp = Biquad.of("highpass", 180, 0.7);
    for (let i = 0; i < len; i++) {
      const x = i / len;
      if ((i & 31) === 0) lp.set(9000 * Math.pow(300 / 9000, x), 0.8);
      const env = Math.pow(1 - x, 1.8) * onset(i, 96);
      ch[start + i] += hp.process(lp.lowpass(bipolar(r))) * env * o.gain;
    }
  });
}

/** Impact under a downbeat: a sub boom that falls in pitch and a short dark thud. */
export function impact(out: Float32Array, at: number, o: { gain: number; seed: number }): void {
  const r = rng(seedOf(o.seed, at));
  const start = Math.round(at * SR);
  const len = Math.min(out.length - start, Math.round(1.6 * SR));
  const lp = Biquad.of("lowpass", 2200, 0.7);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const boom = Math.tanh(2 * Math.sin(ph) * Math.exp(-t / 0.26)) / Math.tanh(2);
    ph += (TAU * (44 + 60 * Math.exp(-t / 0.1))) / SR;
    const thud = lp.process(bipolar(r)) * Math.exp(-t / 0.05) * 0.5;
    out[start + i] += (boom + thud) * onset(i, 24) * tailFade(i, len, Math.round(0.2 * SR)) * o.gain;
  }
}
