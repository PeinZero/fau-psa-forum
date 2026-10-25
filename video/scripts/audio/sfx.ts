/**
 * UI sounds: short, soft and dry so they sit on top of the score without competing.
 * Pitched ones use A and D, the fifth and the tonic of the score's D.
 * Each layer is scaled to an explicit peak so the balance inside a sound is deliberate.
 */
import { Biquad, SR, fromDb, midiHz, smooth } from "./dsp.ts";
import { bipolar, rng, seedOf, type Rng } from "./rng.ts";

export type SfxSound = { name: string; samples: Float32Array; peakDb: number };

const A5 = midiHz(81);
const D5 = midiHz(74);
const D6 = midiHz(86);

const buffer = (seconds: number) => new Float32Array(Math.round(seconds * SR));

/** A noise burst with its own envelope through a chain of filters, added at `at` seconds. */
function burst(out: Float32Array, r: Rng, at: number, tau: number, filters: Biquad[], rise = 0.0004): void {
  const start = Math.round(at * SR);
  const n = Math.min(out.length - start, Math.round(tau * 9 * SR));
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    let x = bipolar(r) * (1 - Math.exp(-t / rise)) * Math.exp(-t / tau);
    for (const f of filters) x = f.process(x);
    out[start + k] += x;
  }
  // Let the filters ring out instead of cutting them off.
  for (let k = n; start + k < out.length && k < n + Math.round(0.01 * SR); k++) {
    let x = 0;
    for (const f of filters) x = f.process(x);
    out[start + k] += x;
  }
}

/** A short damped sine with a soft onset. */
function thump(out: Float32Array, at: number, freq: number, tau: number): void {
  const start = Math.round(at * SR);
  const n = Math.min(out.length - start, Math.round(tau * 9 * SR));
  for (let k = 0; k < n; k++) {
    const t = k / SR;
    out[start + k] += Math.sin(2 * Math.PI * freq * t) * (1 - Math.exp(-t / 0.0015)) * Math.exp(-t / tau);
  }
}

/** A soft bell: a few partials, the upper ones fading faster. */
function bell(out: Float32Array, at: number, freq: number, tau: number, partials: [number, number][], attack: number): void {
  const start = Math.round(at * SR);
  for (let k = 0; start + k < out.length; k++) {
    const t = k / SR;
    let x = 0;
    for (const [ratio, amp] of partials) x += amp * Math.sin(2 * Math.PI * freq * ratio * t) * Math.exp((-t * ratio) / tau);
    out[start + k] += x * smooth(t / attack);
  }
}

/** Draws one layer into its own buffer, scaled to a peak in dB relative to the finished sound. */
function layer(seconds: number, peakDb: number, draw: (out: Float32Array) => void): Float32Array {
  const out = buffer(seconds);
  draw(out);
  let peak = 0;
  for (const x of out) peak = Math.max(peak, Math.abs(x));
  const g = fromDb(peakDb) / Math.max(peak, 1e-12);
  for (let k = 0; k < out.length; k++) out[k] *= g;
  return out;
}

function sum(seconds: number, layers: Float32Array[]): Float32Array {
  const out = buffer(seconds);
  for (const l of layers) for (let k = 0; k < out.length; k++) out[k] += l[k];
  return out;
}

function finish(name: string, out: Float32Array, peakDb: number, fadeOut: number): SfxSound {
  Biquad.of("highpass", 70, 0.7).run(out);
  const n = out.length;
  const fadeIn = Math.round(0.0008 * SR);
  for (let k = 0; k < fadeIn; k++) out[k] *= smooth(k / fadeIn);
  const tail = Math.round(fadeOut * SR);
  for (let k = 0; k < tail; k++) out[n - 1 - k] *= smooth(k / tail);
  let peak = 0;
  for (const x of out) peak = Math.max(peak, Math.abs(x));
  const g = fromDb(peakDb) / peak;
  for (let k = 0; k < n; k++) out[k] *= g;
  return { name, samples: out, peakDb };
}

/** Key tick: plastic tick, short key-body resonance, a soft bottom-out and the up-stroke. */
function key(variant: number): SfxSound {
  const r = rng(seedOf(7, variant));
  const tickF = [3300, 3000, 3650, 3150][variant];
  const bodyF = [1250, 1400, 1150, 1320][variant];
  const lowF = [190, 176, 204, 184][variant];
  const up = [0.072, 0.079, 0.067, 0.075][variant];
  const len = 0.11;
  const out = sum(len, [
    layer(len, 0, (o) => burst(o, r, 0, 0.0012, [Biquad.of("bandpass", tickF, 1.3), Biquad.of("lowpass", 7000)])),
    layer(len, -2, (o) => burst(o, r, 0.0005, 0.0055, [Biquad.of("bandpass", bodyF, 4)])),
    layer(len, -12, (o) => thump(o, 0.001, lowF, 0.01)),
    layer(len, -11, (o) => burst(o, r, up, 0.001, [Biquad.of("bandpass", tickF * 0.9, 1.5), Biquad.of("lowpass", 7000)])),
    layer(len, -13, (o) => burst(o, r, up, 0.004, [Biquad.of("bandpass", bodyF * 1.1, 4)])),
  ]);
  return finish(variant === 0 ? "sfx-key" : `sfx-key-${variant + 1}`, out, -12.5, 0.006);
}

/** The shared soft click: a rounded tick over a low wooden body. */
function clickLayers(r: Rng, len: number, brightness: number, bodyF: number): Float32Array[] {
  return [
    layer(len, -4, (o) => burst(o, r, 0, 0.0015, [Biquad.of("lowpass", brightness), Biquad.of("lowpass", brightness)])),
    layer(len, 0, (o) => burst(o, r, 0.0003, 0.008, [Biquad.of("bandpass", bodyF, 3.5)])),
    layer(len, -9, (o) => thump(o, 0.0005, bodyF / 3.4, 0.016)),
  ];
}

function click(): SfxSound {
  const len = 0.09;
  return finish("sfx-click", sum(len, clickLayers(rng(seedOf(11)), len, 2200, 420)), -12, 0.012);
}

/** Vote: the click, a touch brighter, with a small warm D that rounds it off. */
function vote(): SfxSound {
  const len = 0.26;
  const out = sum(len, [
    ...clickLayers(rng(seedOf(13)), len, 3000, 600),
    layer(len, -6, (o) => bell(o, 0.006, D5, 0.075, [[1, 1], [2, 0.22], [3, 0.06]], 0.006)),
  ]);
  return finish("sfx-vote", out, -12, 0.03);
}

/** Checkbox: a light tick and a faint A chime. */
function check(): SfxSound {
  const r = rng(seedOf(17));
  const len = 0.28;
  const out = sum(len, [
    layer(len, 0, (o) => burst(o, r, 0, 0.0012, [Biquad.of("bandpass", 2800, 1.2), Biquad.of("lowpass", 6500)])),
    layer(len, -3, (o) => burst(o, r, 0.0004, 0.005, [Biquad.of("bandpass", 1500, 4)])),
    layer(len, -9, (o) => bell(o, 0.004, A5, 0.09, [[1, 1], [2, 0.16], [2.76, 0.09], [5.4, 0.03]], 0.003)),
  ]);
  return finish("sfx-check", out, -12, 0.03);
}

/** Notification: two very soft bell notes, A up to D, left to ring out. */
function notify(): SfxSound {
  const len = 0.7;
  const partials: [number, number][] = [[1, 1], [2, 0.2], [3, 0.06], [4.2, 0.03]];
  const out = sum(len, [
    layer(len, 0, (o) => bell(o, 0, A5, 0.12, partials, 0.005)),
    layer(len, -1, (o) => bell(o, 0.105, D6, 0.12, partials, 0.005)),
  ]);
  return finish("sfx-notify", out, -13, 0.05);
}

export function renderSfx(): SfxSound[] {
  return [key(0), key(1), key(2), key(3), click(), vote(), check(), notify()];
}
