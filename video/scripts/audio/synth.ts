/**
 * Synth voices for the score: supersaw chords, saw plucks, a monophonic lead, FM bells, the sub
 * bass, formant "ah/oh" chops and the chat's notification pops. Every saw and pulse is
 * band-limited with polyBLEP, so stacked voices stay smooth instead of fizzing.
 */
import { SR, Svf, type Stereo, midiHz, panGains, smooth } from "./dsp.ts";
import { bipolar, rng, seedOf } from "./rng.ts";

const TAU = 2 * Math.PI;

/** PolyBLEP residual around a step at phase 0 (phase and increment in cycles). */
export function blep(t: number, dt: number): number {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

export const saw = (phase: number, dt: number): number => 2 * phase - 1 - blep(phase, dt);

export function pulse(phase: number, dt: number, width: number): number {
  let shifted = phase - width;
  if (shifted < 0) shifted += 1;
  return (phase < width ? 1 : -1) + blep(phase, dt) - blep(shifted, dt);
}

/** Raised-cosine release factor once a note is past its note-off. */
const releaseGain = (k: number, off: number, rel: number): number => (k < off ? 1 : 1 - smooth((k - off) / rel));

// ---------------------------------------------------------------- supersaw chords

export type ChordNote = { t: number; end: number; midi: number; gain: number };
export type SupersawOptions = { voices: number; detune: number; width: number; attack: number; release: number; seed: number };

/** Detuned saw stacks; the outer voices spread to both sides, the centre voice stays in the middle. */
export function supersaw(bus: Stereo, notes: ChordNote[], o: SupersawOptions): void {
  const n = bus.l.length;
  for (const note of notes) {
    const r = rng(seedOf(o.seed, note.t, note.midi));
    const f = midiHz(note.midi);
    const start = Math.round(note.t * SR);
    const off = Math.round(note.end * SR);
    const rel = Math.max(1, Math.round(o.release * SR));
    const att = Math.max(1, Math.round(o.attack * SR));
    const stop = Math.min(n, off + rel);
    const voices: { dt: number; phase: number; g: number; pan: number }[] = [];
    let power = 0;
    for (let v = 0; v < o.voices; v++) {
      const pos = o.voices === 1 ? 0 : (2 * v) / (o.voices - 1) - 1;
      const cents = o.detune * Math.sign(pos) * Math.pow(Math.abs(pos), 1.4) + bipolar(r) * 1.5;
      const g = pos === 0 ? 1 : 0.78;
      power += g * g;
      voices.push({ dt: (f * Math.pow(2, cents / 1200)) / SR, phase: r(), g, pan: o.width * (v % 2 === 0 ? pos : -pos) });
    }
    const norm = note.gain / Math.sqrt(power);
    for (const voice of voices) {
      const [gl, gr] = panGains(voice.pan);
      const al = voice.g * norm * gl;
      const ar = voice.g * norm * gr;
      const dt = voice.dt;
      let ph = voice.phase;
      for (let k = Math.max(0, start); k < stop; k++) {
        const i = k - start;
        const env = (i < att ? i / att : 1) * releaseGain(k, off, rel);
        const x = (2 * ph - 1 - blep(ph, dt)) * env;
        ph += dt;
        if (ph >= 1) ph -= 1;
        bus.l[k] += x * al;
        bus.r[k] += x * ar;
      }
    }
  }
}

// ---------------------------------------------------------------- plucks

export type PluckNote = { t: number; dur: number; midi: number; vel: number; pan?: number };
export type PluckOptions = {
  /** Amplitude decay time constant, seconds. */
  decay: number;
  release: number;
  /** Resting cutoff in Hz, plus `keytrack` times the note frequency. */
  cutoff: number;
  keytrack: number;
  /** How far the filter envelope opens above the resting cutoff at full velocity, Hz. */
  envAmount: number;
  filterDecay: number;
  q: number;
  detune: number;
  /** Level of a square at the same pitch under the two saws. */
  square: number;
  seed: number;
};

/** Two detuned saws (and an optional square) through a resonant low-pass with a snappy envelope. */
export function plucks(bus: Stereo, notes: PluckNote[], o: PluckOptions): void {
  const n = bus.l.length;
  const att = Math.round(0.0015 * SR);
  for (const note of notes) {
    const r = rng(seedOf(o.seed, note.t, note.midi));
    const f = midiHz(note.midi);
    const start = Math.round(note.t * SR);
    const off = start + Math.round(note.dur * SR);
    const rel = Math.max(1, Math.round(o.release * SR));
    const stop = Math.min(n, off + rel, start + Math.round(o.decay * 9 * SR));
    const d1 = (f * Math.pow(2, -o.detune / 1200)) / SR;
    const d2 = (f * Math.pow(2, o.detune / 1200)) / SR;
    const d3 = f / SR;
    let p1 = r();
    let p2 = r();
    let p3 = r();
    const svf = new Svf();
    const [gl, gr] = panGains(note.pan ?? 0);
    const end = stop - start;
    const fade = Math.round(0.004 * SR);
    for (let k = start; k < stop; k++) {
      const i = k - start;
      const t = i / SR;
      if ((i & 15) === 0) svf.set(o.cutoff + o.keytrack * f + o.envAmount * note.vel * Math.exp(-t / o.filterDecay), o.q);
      let env = Math.exp(-t / o.decay) * (i < att ? i / att : 1) * releaseGain(k, off, rel);
      if (i > end - fade) env *= (end - i) / fade;
      const x = 0.5 * (saw(p1, d1) + saw(p2, d2)) + (o.square ? o.square * pulse(p3, d3, 0.5) : 0);
      p1 += d1;
      if (p1 >= 1) p1 -= 1;
      p2 += d2;
      if (p2 >= 1) p2 -= 1;
      p3 += d3;
      if (p3 >= 1) p3 -= 1;
      const y = svf.lowpass(x) * env * note.vel;
      bus.l[k] += y * gl;
      bus.r[k] += y * gr;
    }
  }
}

// ---------------------------------------------------------------- lead

export type LeadNote = { t: number; dur: number; midi: number; vel: number };
export type LeadOptions = {
  glide: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  cutoff: number;
  keytrack: number;
  envAmount: number;
  filterDecay: number;
  q: number;
  detune: number;
  /** Level of a narrow pulse an octave down, for body. */
  pulse: number;
  /** Vibrato depth in semitones, faded in on held notes. */
  vibrato: number;
  seed: number;
};

/**
 * A monophonic lead: one continuous oscillator bank that glides between notes, so a phrase
 * sounds like one hand on one instrument and never clicks between notes.
 */
export function lead(length: number, notes: LeadNote[], o: LeadOptions): Float32Array {
  const out = new Float32Array(length);
  if (!notes.length) return out;
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  const r = rng(seedOf(o.seed));
  const coef = (s: number) => 1 - Math.exp(-1 / Math.max(1, s * SR));
  const cAtt = coef(o.attack / 3);
  const cDec = coef(o.decay);
  const cRel = coef(o.release / 3);
  const cGlide = coef(o.glide);
  const detunes = [-o.detune, 0, o.detune].map((c) => Math.pow(2, c / 1200));
  const phases = [r(), r(), r(), r()];
  const svf = new Svf();
  let idx = -1;
  let pitch = sorted[0].midi;
  let env = 0;
  let attacking = false;
  let noteStart = 0;
  let noteOff = 0;
  let vel = 0;
  const first = Math.round(sorted[0].t * SR);
  for (let k = first; k < length; k++) {
    while (idx + 1 < sorted.length && k >= Math.round(sorted[idx + 1].t * SR)) {
      idx++;
      const note = sorted[idx];
      noteStart = k;
      noteOff = k + Math.round(note.dur * SR);
      vel = note.vel;
      attacking = true;
      if (env < 1e-3) pitch = note.midi;
    }
    const note = sorted[idx];
    const gate = k < noteOff;
    if (!gate && idx === sorted.length - 1 && env < 1e-5) break;
    if (gate) {
      if (attacking) {
        env += (1.05 - env) * cAtt;
        if (env >= 1) {
          env = 1;
          attacking = false;
        }
      } else {
        env += (o.sustain - env) * cDec;
      }
    } else {
      env += -env * cRel;
    }
    pitch += (note.midi - pitch) * cGlide;
    const t = (k - noteStart) / SR;
    const vib = o.vibrato * smooth((t - 0.22) / 0.25) * Math.sin(TAU * 5.4 * t);
    const f = midiHz(pitch + vib);
    if (((k - first) & 15) === 0) {
      svf.set(o.cutoff + o.keytrack * f + o.envAmount * vel * Math.exp(-t / o.filterDecay), o.q);
    }
    let x = 0;
    for (let v = 0; v < 3; v++) {
      const dt = (f * detunes[v]) / SR;
      x += saw(phases[v], dt);
      phases[v] += dt;
      if (phases[v] >= 1) phases[v] -= 1;
    }
    x /= 3;
    if (o.pulse) {
      const dt = f / 2 / SR;
      x += o.pulse * pulse(phases[3], dt, 0.3);
      phases[3] += dt;
      if (phases[3] >= 1) phases[3] -= 1;
    }
    out[k] = svf.lowpass(x) * env * vel;
  }
  return out;
}

// ---------------------------------------------------------------- FM bells

export type BellNote = { t: number; dur: number; midi: number; vel: number; pan?: number };
export type BellOptions = { ratio: number; index: number; indexDecay: number; decay: number; release: number; detune: number };

/** Two-operator FM: a glassy, bell-like tone whose brightness falls away after the strike. */
export function bells(bus: Stereo, notes: BellNote[], o: BellOptions): void {
  const n = bus.l.length;
  const att = Math.round(0.0015 * SR);
  for (const note of notes) {
    const start = Math.round(note.t * SR);
    const off = start + Math.round(note.dur * SR);
    const rel = Math.max(1, Math.round(o.release * SR));
    const stop = Math.min(n, off + rel, start + Math.round(o.decay * 8 * SR));
    const end = stop - start;
    const fade = Math.round(0.01 * SR);
    for (const side of [-1, 1]) {
      const fc = midiHz(note.midi) * Math.pow(2, (side * o.detune) / 1200);
      const [gl, gr] = panGains((note.pan ?? 0) + 0.22 * side);
      const dc = (TAU * fc) / SR;
      const dm = dc * o.ratio;
      let pc = 0;
      let pm = 0;
      for (let k = start; k < stop; k++) {
        const i = k - start;
        const t = i / SR;
        const index = o.index * Math.exp(-t / o.indexDecay) + 0.12;
        let env = Math.exp(-t / o.decay) * (i < att ? i / att : 1) * releaseGain(k, off, rel);
        if (i > end - fade) env *= (end - i) / fade;
        const x = Math.sin(pc + index * Math.sin(pm)) * env * note.vel * 0.5;
        pc += dc;
        pm += dm;
        if (pc > TAU) pc -= TAU;
        if (pm > TAU) pm -= TAU;
        bus.l[k] += x * gl;
        bus.r[k] += x * gr;
      }
    }
  }
}

// ---------------------------------------------------------------- sub bass

export type BassNote = { t: number; end: number; midi: number; vel: number };

/** A sine that follows the roots, gliding a touch between them; mono by design. */
export function subBass(length: number, notes: BassNote[], o: { glide: number; attack: number; release: number }): Float32Array {
  const out = new Float32Array(length);
  if (!notes.length) return out;
  const sorted = [...notes].sort((a, b) => a.t - b.t);
  const coef = (s: number) => 1 - Math.exp(-1 / Math.max(1, s * SR));
  const cAtt = coef(o.attack / 3);
  const cRel = coef(o.release / 3);
  const cGlide = coef(o.glide);
  let idx = -1;
  let ph = 0;
  let pitch = sorted[0].midi;
  let amp = 0;
  for (let k = Math.round(sorted[0].t * SR); k < length; k++) {
    while (idx + 1 < sorted.length && k >= Math.round(sorted[idx + 1].t * SR)) {
      idx++;
      if (amp < 1e-3) pitch = sorted[idx].midi;
    }
    const note = sorted[idx];
    const on = k < Math.round(note.end * SR);
    if (!on && idx === sorted.length - 1 && amp < 1e-6) break;
    amp += ((on ? note.vel : 0) - amp) * (on ? cAtt : cRel);
    pitch += (note.midi - pitch) * cGlide;
    out[k] = Math.sin(ph) * amp;
    ph += (TAU * midiHz(pitch)) / SR;
    if (ph > TAU) ph -= TAU;
  }
  return out;
}

// ---------------------------------------------------------------- formant chops

export type Vowel = "ah" | "oh";

/** Sung-vowel formants (centre Hz, level dB, bandwidth Hz): an alto "ah" and a soprano "oh". */
const FORMANTS: Record<Vowel, { f: number[]; db: number[]; bw: number[] }> = {
  ah: { f: [800, 1150, 2800, 3500, 4950], db: [0, -4, -20, -36, -60], bw: [80, 90, 120, 130, 140] },
  oh: { f: [450, 800, 2830, 3800, 4950], db: [0, -11, -22, -22, -50], bw: [70, 80, 100, 130, 135] },
};

export type ChopNote = { t: number; dur: number; midi: number; vel: number; from: Vowel; to: Vowel; pan: number };

/**
 * Wordless vocal chops: a band-limited glottal saw with a small scoop into the note, vibrato and
 * breath, through five parallel formant resonators that morph between two vowels. Each chop is
 * doubled a few cents apart, the way stacked vocal takes are.
 */
export function chops(bus: Stereo, notes: ChopNote[], seed: number): void {
  const n = bus.l.length;
  const att = Math.round(0.006 * SR);
  const rel = Math.round(0.035 * SR);
  for (const note of notes) {
    const r = rng(seedOf(seed, note.t, note.midi));
    const start = Math.round(note.t * SR);
    const off = start + Math.round(note.dur * SR);
    const stop = Math.min(n, off + rel);
    const a = FORMANTS[note.from];
    const b = FORMANTS[note.to];
    for (const side of [-1, 1]) {
      const filters = a.f.map(() => new Svf());
      const gains = a.db.map((db) => Math.pow(10, db / 20));
      const [gl, gr] = panGains(note.pan + 0.3 * side);
      const detune = side * 0.07;
      const lag = side > 0 ? Math.round(0.006 * SR) : 0;
      let ph = r();
      let jitter = 0;
      for (let k = start + lag; k < stop; k++) {
        const i = k - start - lag;
        const t = i / SR;
        if ((i & 31) === 0) {
          const m = smooth(t / Math.max(0.05, note.dur));
          filters.forEach((svf, j) => {
            const f = a.f[j] + (b.f[j] - a.f[j]) * m;
            const bw = a.bw[j] + (b.bw[j] - a.bw[j]) * m;
            svf.set(f, f / (bw * 1.6));
            gains[j] = Math.pow(10, (a.db[j] + (b.db[j] - a.db[j]) * m) / 20);
          });
          jitter += (bipolar(r) * 0.04 - jitter) * 0.3;
        }
        const scoop = -0.6 * Math.exp(-t / 0.03);
        const vib = 0.18 * smooth((t - 0.12) / 0.15) * Math.sin(TAU * 5.2 * t);
        const dt = midiHz(note.midi + scoop + vib + jitter + detune) / SR;
        const src = saw(ph, dt) + 0.05 * bipolar(r);
        ph += dt;
        if (ph >= 1) ph -= 1;
        let y = 0;
        for (let j = 0; j < filters.length; j++) {
          filters[j].lowpass(src);
          y += filters[j].band * gains[j];
        }
        const env = (i < att ? i / att : 1) * releaseGain(k, off, rel);
        const x = y * env * note.vel;
        bus.l[k] += x * gl;
        bus.r[k] += x * gr;
      }
    }
  }
}

// ---------------------------------------------------------------- notification pops

export type Pop = {
  t: number;
  midi: number;
  vel: number;
  pan: number;
  /** Semitones the bubble starts below its note before it snaps up to pitch. */
  glide: number;
  glideTau: number;
  decay: number;
  /** Level of the octave partial. */
  partial: number;
  /** Level of the bright tick that marks the onset. */
  click: number;
  seed: number;
};

/**
 * A bubbly notification pop: a sine that rises into its note like a water drop, an octave
 * partial that dies first, and a short bright tick, all starting on the exact sample of the beat.
 */
export function pops(bus: Stereo, list: Pop[]): void {
  const n = bus.l.length;
  const att = 14;
  for (const p of list) {
    const r = rng(seedOf(p.seed, p.t));
    const start = Math.round(p.t * SR);
    const len = Math.min(n - start, Math.round(p.decay * 7 * SR));
    const f0 = midiHz(p.midi);
    const tick = new Svf();
    tick.set(4800, 0.9);
    const [gl, gr] = panGains(p.pan);
    const fade = Math.round(0.004 * SR);
    let ph = 0;
    let ph2 = 0;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const f = f0 * Math.pow(2, (-p.glide * Math.exp(-t / p.glideTau)) / 12);
      let env = (i < att ? i / att : 1) * Math.exp(-t / p.decay);
      if (i > len - fade) env *= (len - i) / fade;
      const tone = Math.sin(ph) + p.partial * Math.sin(ph2) * Math.exp(-t / (p.decay * 0.4));
      tick.lowpass(bipolar(r) * Math.exp(-t / 0.0007));
      const y = (tone * env + p.click * tick.band * (i < att ? i / att : 1)) * p.vel;
      ph += (TAU * f) / SR;
      ph2 += (TAU * 2 * f) / SR;
      bus.l[start + i] += y * gl;
      bus.r[start + i] += y * gr;
    }
  }
}
