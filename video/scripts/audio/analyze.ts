/**
 * Measurements standing in for listening: loudness and true peak, the section-by-section arc,
 * spectral balance per section, the drop and the final hit landing on their exact sample, every
 * chat pop on its beat, the kick where it belongs, and the hygiene checks (clicks, clipping, DC,
 * silence gaps, a clean end).
 */
import { Biquad, SR, type Stereo, toDb } from "./dsp.ts";
import { kPower, loudness, truePeakDb } from "./loudness.ts";

export type ScorePlan = {
  beatSeconds: number;
  beatsPerBar: number;
  sections: { name: string; fromBar: number; toBar: number }[];
  /** Seconds. */
  drop: number;
  finalHit: number;
  riser: [number, number];
  pops: { label: string; beat: number }[];
  calmPops: { label: string; beat: number }[];
  kicks: { beat: number; kind: string }[];
  noKicks: number[];
  /** One dry kick of each kind as rendered, for locating each kick by its shape. */
  kickTemplates: Record<string, Float32Array>;
  /** Where the hook is played: [fromBar, toBar, label]. */
  hook: [number, number, string][];
  targetLufs: number;
  length: number;
};

const pad = (s: string | number, n: number) => String(s).padStart(n);
const fmt = (x: number, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : "-inf");

function windowStats(st: Stereo, from: number, to: number): { rms: number; peak: number } {
  let sum = 0;
  let peak = 0;
  const a = Math.max(0, Math.round(from));
  const b = Math.min(st.l.length, Math.round(to));
  for (let k = a; k < b; k++) {
    sum += st.l[k] * st.l[k] + st.r[k] * st.r[k];
    peak = Math.max(peak, Math.abs(st.l[k]), Math.abs(st.r[k]));
  }
  return { rms: toDb(Math.sqrt(sum / Math.max(1, 2 * (b - a)))), peak: toDb(peak) };
}

/** Sample jumps far larger than the local high-frequency level: clicks or truncations. */
export function findClicks(ch: Float32Array): number[] {
  const n = ch.length;
  const prefix = new Float64Array(n + 1);
  for (let k = 1; k < n; k++) {
    const d = ch[k] - ch[k - 1];
    prefix[k + 1] = prefix[k] + d * d;
  }
  const half = Math.round(0.005 * SR);
  const hits: number[] = [];
  for (let k = 1; k < n; k++) {
    const d = Math.abs(ch[k] - ch[k - 1]);
    if (d < 0.003) continue;
    const a = Math.max(1, k - half);
    const b = Math.min(n, k + half);
    const local = Math.sqrt((prefix[b] - prefix[a]) / (b - a));
    if (d > 8 * local) hits.push(k);
  }
  return hits;
}

/** Mono sum of [from, to) samples; silence stands in for anything before the start. */
const mono = (st: Stereo, from: number, to: number): Float32Array => {
  const a = Math.round(from);
  const b = Math.min(st.l.length, Math.round(to));
  const out = new Float32Array(Math.max(0, b - a));
  for (let k = Math.max(0, a); k < b; k++) out[k - a] = 0.5 * (st.l[k] + st.r[k]);
  return out;
};

function run(x: Float32Array, chain: Biquad[]): Float32Array {
  const out = new Float32Array(x.length);
  for (let k = 0; k < x.length; k++) {
    let y = x[k];
    for (const f of chain) y = f.process(y);
    out[k] = y;
  }
  return out;
}

/** Trailing RMS over `win` samples. */
function envelope(x: Float32Array, win: number): Float32Array {
  const out = new Float32Array(x.length);
  let sum = 0;
  for (let k = 0; k < x.length; k++) {
    sum += x[k] * x[k];
    if (k >= win) sum -= x[k - win] * x[k - win];
    out[k] = Math.sqrt(Math.max(0, sum) / win);
  }
  return out;
}

type Onset = { offsetMs: number; riseDb: number };

/**
 * Where a transient starts relative to `t` (seconds): the first sample, searching from
 * `t - search`, where the envelope has covered a tenth of its climb from the level just before to
 * its peak just after, and has cleared the highest flicker of that earlier level (so a noisy bed
 * cannot pass for an onset). Filters run over a stretch of lead-in so they have settled.
 */
function onsetNear(st: Stereo, t: number, o: { chain: () => Biquad[]; winMs: number; search: number; baseFrom: number; baseTo: number; peakTo: number }): Onset {
  const lead = 0.2;
  const from = (t - lead) * SR;
  const x = run(mono(st, from, (t + o.peakTo + 0.01) * SR), o.chain());
  const env = envelope(x, Math.max(1, Math.round((o.winMs / 1000) * SR)));
  const at = (s: number) => Math.round((t + s) * SR - from);
  let base = 0;
  let floor = 0;
  let count = 0;
  for (let k = Math.max(0, at(-o.baseFrom)); k < at(-o.baseTo); k++) {
    base += env[k];
    floor = Math.max(floor, env[k]);
    count++;
  }
  base = count ? base / count : 0;
  let peak = 0;
  for (let k = Math.max(0, at(-o.search)); k < Math.min(env.length, at(o.peakTo)); k++) peak = Math.max(peak, env[k]);
  const threshold = Math.max(base + 0.1 * (peak - base), Math.min(1.25 * floor, 0.5 * peak));
  let onset = -1;
  for (let k = Math.max(0, at(-o.search)); k < env.length; k++) {
    if (env[k] >= threshold) {
      onset = k;
      break;
    }
  }
  return { offsetMs: onset < 0 ? NaN : ((onset - at(0)) / SR) * 1000, riseDb: toDb(peak / Math.max(base, 1e-9)) };
}

const BAND_EDGES = [60, 120, 250, 500, 1000, 2000, 4000, 8000];
export const BAND_LABELS = ["<60", "60-120", "120-250", "250-500", "0.5-1k", "1-2k", "2-4k", "4-8k", ">8k"];

/** Percent of energy per band (mono sum, Linkwitz-Riley crossovers) between two sample indices. */
export function bandShares(st: Stereo, from: number, to: number): number[] {
  const warm = Math.round(0.2 * SR);
  const x = mono(st, from - warm, to);
  const skip = Math.min(warm, Math.round(from));
  const energies = BAND_LABELS.map((_, i) => {
    const chain: Biquad[] = [];
    if (i > 0) chain.push(Biquad.of("highpass", BAND_EDGES[i - 1], Math.SQRT1_2), Biquad.of("highpass", BAND_EDGES[i - 1], Math.SQRT1_2));
    if (i < BAND_EDGES.length) chain.push(Biquad.of("lowpass", BAND_EDGES[i], Math.SQRT1_2), Biquad.of("lowpass", BAND_EDGES[i], Math.SQRT1_2));
    let e = 0;
    for (let k = 0; k < x.length; k++) {
      let y = x[k];
      for (const f of chain) y = f.process(y);
      if (k >= skip) e += y * y;
    }
    return e;
  });
  const total = energies.reduce((a, b) => a + b, 0);
  return energies.map((e) => (100 * e) / total);
}

/** Highest 400 ms (momentary) loudness inside [from, to) seconds. */
function maxMomentary(prefix: Float64Array, from: number, to: number): number {
  const block = Math.round(0.4 * SR);
  let best = -Infinity;
  for (let s = Math.round(from * SR); s + block <= Math.round(to * SR); s += Math.round(0.01 * SR)) {
    best = Math.max(best, -0.691 + 10 * Math.log10(Math.max(1e-20, (prefix[s + block] - prefix[s]) / block)));
  }
  return best;
}

export function analyzeScore(st: Stereo, plan: ScorePlan): string[] {
  const problems: string[] = [];
  const beat = plan.beatSeconds;
  const bar = beat * plan.beatsPerBar;
  const fail = (ok: boolean, label: string) => {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) problems.push(label);
  };

  const meter = loudness(st);
  const power = kPower(st);
  const prefix = new Float64Array(power.length + 1);
  for (let k = 0; k < power.length; k++) prefix[k + 1] = prefix[k] + power[k];
  const lufsRange = (a: number, b: number) => meter.range(a * SR, b * SR);
  const sectionOf = (b: number) => plan.sections.find((s) => b >= s.fromBar && b < s.toBar)?.name ?? "";

  console.log("\nPer bar (2 s each; ungated LUFS, RMS and peak in dBFS)");
  console.log(" bar   time   section              LUFS    RMS   peak");
  for (let i = 0; i * bar * SR < st.l.length; i++) {
    const { rms, peak } = windowStats(st, i * bar * SR, (i + 1) * bar * SR);
    const lu = lufsRange(i * bar, (i + 1) * bar);
    const meterBar = "#".repeat(Math.max(0, Math.round((lu + 40) / 1)));
    console.log(`${pad(i, 4)}  ${pad(fmt(i * bar, 0), 3)} s  ${sectionOf(i).padEnd(18)}  ${pad(fmt(lu), 6)} ${pad(fmt(rms), 6)} ${pad(fmt(peak), 6)}  ${meterBar}`);
  }

  const tp = truePeakDb(st);
  let samplePeak = 0;
  let clipped = 0;
  let dcL = 0;
  let dcR = 0;
  for (let k = 0; k < st.l.length; k++) {
    const a = Math.max(Math.abs(st.l[k]), Math.abs(st.r[k]));
    samplePeak = Math.max(samplePeak, a);
    if (a >= 0.9999) clipped++;
    dcL += st.l[k];
    dcR += st.r[k];
  }
  dcL /= st.l.length;
  dcR /= st.r.length;
  const length = st.l.length / SR;
  console.log("\nLoudness and level");
  console.log(`  length            ${fmt(length, 3)} s (${st.l.length} samples at ${SR} Hz)`);
  console.log(`  integrated        ${fmt(meter.integrated, 2)} LUFS (target ${plan.targetLufs} +-1)`);
  console.log(`  max short-term    ${fmt(meter.maxShortTerm, 2)} LUFS`);
  console.log(`  max momentary     ${fmt(maxMomentary(prefix, 0, length), 2)} LUFS`);
  console.log(`  true peak (4x)    ${fmt(tp, 2)} dBTP (limit -1.0)`);
  console.log(`  sample peak       ${fmt(toDb(samplePeak), 2)} dBFS; clipped samples ${clipped}`);
  console.log(`  DC offset         L ${dcL.toExponential(2)}  R ${dcR.toExponential(2)}`);
  fail(Math.abs(length - plan.length) < 0.5 / SR, `length is exactly ${fmt(plan.length, 3)} s`);
  fail(Math.abs(meter.integrated - plan.targetLufs) <= 1, `integrated loudness ${fmt(meter.integrated, 2)} LUFS within 1 LU of ${plan.targetLufs}`);
  fail(tp <= -1.0, `true peak ${fmt(tp, 2)} dBTP <= -1.0`);
  fail(clipped === 0, "no clipped samples");
  fail(Math.abs(dcL) < 1e-4 && Math.abs(dcR) < 1e-4, "DC offset below 1e-4");

  console.log("\nSections (ungated LUFS over the whole section; max momentary; crest = peak - RMS)");
  const sec = plan.sections.map((s) => {
    const a = s.fromBar * bar;
    const b = s.toBar * bar;
    const lu = lufsRange(a, b);
    const mom = maxMomentary(prefix, a, b);
    const { rms, peak } = windowStats(st, a * SR, b * SR);
    console.log(`  bars ${pad(s.fromBar, 2)}-${pad(s.toBar, 2)}  ${pad(fmt(a, 0), 2)}-${pad(fmt(b, 0), 2)} s  ${s.name.padEnd(18)} ${pad(fmt(lu), 6)} LUFS  max ${pad(fmt(mom), 6)}  crest ${fmt(peak - rms)} dB`);
    return { ...s, lu, mom };
  });
  const by = (name: string) => {
    const found = sec.find((s) => s.name === name);
    if (!found) throw new Error(`No section ${name}`);
    return found;
  };
  const chat = lufsRange(0, plan.riser[0]);
  const riserLu = lufsRange(plan.riser[0], plan.riser[1]);
  const drop = by("One place").lu;
  const grooveNames = ["Search", "The answer", "Ask", "Both sides"];
  const groove = grooveNames.map((n) => by(n).lu);
  const grooveMean = 10 * Math.log10(groove.reduce((a, x) => a + Math.pow(10, x / 10), 0) / groove.length);
  const light = by("Start here").lu;
  const peakSection = by("Everything else");
  const breakdown = by("Back to the chat").lu;
  const before = 10 * Math.log10(Math.max(1e-20, (prefix[Math.round(plan.drop * SR)] - prefix[Math.round((plan.drop - 0.4) * SR)]) / (0.4 * SR))) - 0.691;
  const after = 10 * Math.log10(Math.max(1e-20, (prefix[Math.round((plan.drop + 0.4) * SR)] - prefix[Math.round(plan.drop * SR)]) / (0.4 * SR))) - 0.691;
  const hitMom = maxMomentary(prefix, plan.finalHit, plan.finalHit + 0.8);
  console.log(`\n  chat before the riser ${fmt(chat)} LUFS, riser bar ${fmt(riserLu)} LUFS, groove mean ${fmt(grooveMean)} LUFS`);
  console.log(`  400 ms either side of the drop: ${fmt(before)} -> ${fmt(after)} LUFS`);
  console.log(`  final hit max momentary ${fmt(hitMom)} LUFS vs the breakdown ${fmt(breakdown)} LUFS`);
  console.log("\nArc");
  fail(drop - chat >= 8, `the drop (bars 6-10) is >= 8 LU above the chat (${fmt(drop - chat)} LU)`);
  fail(riserLu > chat + 1 && riserLu < drop - 2, `the riser bar builds above the chat and stays >= 2 LU under the drop`);
  fail(after - before >= 6, `the drop hits >= 6 LU above the 400 ms before it, riser included (${fmt(after - before)} LU)`);
  fail(groove.every((g) => Math.abs(g - drop) <= 2), "the groove scenes hold within 2 LU of the drop");
  fail(light <= grooveMean - 1 && light >= grooveMean - 5, `"Start here" is 1-5 LU lighter than the groove (${fmt(grooveMean - light)} LU)`);
  fail(sec.every((s) => s.lu <= peakSection.lu + 1e-9), `"Everything else" is the loudest section (${fmt(peakSection.lu)} LUFS)`);
  fail(peakSection.lu >= grooveMean + 0.5, `the peak sits >= 0.5 LU over the groove (${fmt(peakSection.lu - grooveMean)} LU)`);
  fail(breakdown <= peakSection.lu - 8, `the breakdown sits >= 8 LU under the peak (${fmt(peakSection.lu - breakdown)} LU)`);
  fail(hitMom >= breakdown + 8, `the final hit jumps >= 8 LU over the breakdown (${fmt(hitMom - breakdown)} LU)`);

  console.log("\nSpectral balance per section (% of energy, mono sum)");
  console.log(`  ${"section".padEnd(18)} ${BAND_LABELS.map((l) => pad(l, 7)).join(" ")}`);
  const shares = plan.sections.map((s) => {
    const sh = bandShares(st, s.fromBar * bar * SR, s.toBar * bar * SR);
    console.log(`  ${s.name.padEnd(18)} ${sh.map((x) => pad(fmt(x), 7)).join(" ")}`);
    return sh;
  });
  const all = bandShares(st, 0, st.l.length);
  console.log(`  ${"whole film".padEnd(18)} ${all.map((x) => pad(fmt(x), 7)).join(" ")}`);
  /** Energy above 2 kHz against 250 Hz-2 kHz in dB: how bright the music is, whatever the bass does. */
  const bright = (sh: number[]) => 10 * Math.log10((sh[6] + sh[7] + sh[8]) / (sh[3] + sh[4] + sh[5]));
  const mud = (sh: number[]) => sh[2] + sh[3];
  console.log("\nTone (brightness = energy above 2 kHz relative to 250 Hz-2 kHz)");
  plan.sections.forEach((s, i) => console.log(`  ${s.name.padEnd(18)} ${pad(fmt(bright(shares[i])), 6)} dB`));
  fail(bright(shares[0]) <= bright(shares[1]) - 3, `the chat is filtered: >= 3 dB darker than the drop (${fmt(bright(shares[1]) - bright(shares[0]))} dB)`);
  fail(bright(shares[8]) <= bright(shares[7]) - 3, `the breakdown's filter closes: >= 3 dB darker than the peak (${fmt(bright(shares[7]) - bright(shares[8]))} dB)`);
  fail(shares.slice(1, 8).every((sh) => mud(sh) < 30), "120-500 Hz stays under 30 % of the energy from the drop to the peak (no low-mid build-up)");

  const transient = (t: number) =>
    onsetNear(st, t, { chain: () => [], winMs: 0.5, search: 0.03, baseFrom: 0.1, baseTo: 0.01, peakTo: 0.03 });
  console.log("\nTransients (onset = 10 % of the climb from the level before to the peak after)");
  for (const [label, t] of [["drop", plan.drop], ["final hit", plan.finalHit]] as const) {
    const o = transient(t);
    const jump = windowStats(st, t * SR, (t + 0.1) * SR).rms - windowStats(st, (t - 0.1) * SR, t * SR).rms;
    console.log(`  ${label.padEnd(10)} expected ${fmt(t, 3)} s, onset ${fmt(t + o.offsetMs / 1000, 4)} s (${fmt(o.offsetMs, 2)} ms), rise ${fmt(o.riseDb)} dB, RMS 100 ms after vs before +${fmt(jump)} dB`);
    fail(Math.abs(o.offsetMs) <= 1, `${label} lands within 1 ms of ${fmt(t, 3)} s`);
  }

  const popOnset = (t: number) =>
    onsetNear(st, t, {
      chain: () => [Biquad.of("highpass", 3000, Math.SQRT1_2), Biquad.of("highpass", 3000, Math.SQRT1_2)],
      winMs: 0.25,
      search: 0.02,
      baseFrom: 0.06,
      baseTo: 0.025,
      peakTo: 0.015,
    });
  console.log("\nChat pops (onset in the band above 3 kHz)");
  let worst = 0;
  for (const [group, list, minRise] of [["noise", plan.pops, 10], ["calm", plan.calmPops, 10]] as const) {
    for (const p of list) {
      const t = p.beat * beat;
      const o = popOnset(t);
      worst = Math.max(worst, Math.abs(o.offsetMs));
      console.log(`  ${group.padEnd(5)} beat ${pad(p.beat, 5)}  ${pad(fmt(t, 3), 6)} s  ${pad(fmt(o.offsetMs, 2), 6)} ms  rise ${pad(fmt(o.riseDb), 5)} dB  ${p.label}`);
      if (!(Math.abs(o.offsetMs) <= 1)) problems.push(`pop on beat ${p.beat} is ${fmt(o.offsetMs, 2)} ms off`);
      if (!(o.riseDb >= minRise)) problems.push(`pop on beat ${p.beat} only rises ${fmt(o.riseDb)} dB above its surroundings`);
    }
  }
  fail(worst <= 1, `every pop lands within 1 ms of its beat (worst ${fmt(worst, 2)} ms)`);

  /**
   * The kick in the band under 120 Hz, where the pumped bass ducks out of its way. A kick is
   * there when the 80 ms after the beat carry at least twice the energy of the 80 ms before it
   * and match the rendered kick's shape (normalised correlation); the lag of the best match
   * says how far from the beat it sits.
   */
  const lowPass = () => [Biquad.of("lowpass", 120, Math.SQRT1_2), Biquad.of("lowpass", 120, Math.SQRT1_2)];
  const lowBand = run(mono(st, 0, st.l.length), lowPass());
  const span = Math.round(0.08 * SR);
  const templates = new Map(Object.entries(plan.kickTemplates).map(([kind, x]) => {
    const template = run(x.slice(0, span), lowPass());
    return [kind, { template, energy: template.reduce((a, v) => a + v * v, 0) }];
  }));
  const maxLag = Math.round(0.005 * SR);
  const kickAt = (b: number, kind: string) => {
    const { template, energy: tEnergy } = templates.get(kind) ?? templates.get("full")!;
    const t = Math.round(b * beat * SR);
    let after = 0;
    let before = 0;
    for (let i = 0; i < span; i++) {
      after += lowBand[t + i] ** 2;
      if (t - span + i >= 0) before += lowBand[t - span + i] ** 2;
    }
    let best = -1;
    let lag = 0;
    for (let l = -maxLag; l <= maxLag; l++) {
      let dot = 0;
      let e = 0;
      for (let i = 0; i < span; i++) {
        const x = lowBand[t + l + i] ?? 0;
        dot += x * template[i];
        e += x * x;
      }
      const ncc = dot / Math.sqrt(Math.max(1e-20, e * tEnergy));
      if (ncc > best) {
        best = ncc;
        lag = l;
      }
    }
    return { riseDb: 10 * Math.log10(Math.max(after, 1e-20) / Math.max(before, 1e-20)), match: best, lagMs: (lag / SR) * 1000, levelDb: 10 * Math.log10(after / span + 1e-20) };
  };
  const isKick = (k: { riseDb: number; match: number; levelDb: number }) => k.riseDb >= 3 && k.match >= 0.8 && k.levelDb >= -50;
  console.log("\nKick (band under 120 Hz: energy 80 ms after vs before the beat, correlation with the rendered kick)");
  const found = plan.kicks.map(({ beat: b, kind }) => ({ b, ...kickAt(b, kind) }));
  const missing = found.filter((k) => !isKick(k)).map((k) => k.b);
  const present = found.filter(isKick);
  const quiet = plan.noKicks.map((b) => ({ b, ...kickAt(b, "full") }));
  const strays = quiet.filter(isKick).map((k) => k.b);
  const range = (xs: number[]) => `${fmt(Math.min(...xs), 2)}..${fmt(Math.max(...xs), 2)}`;
  console.log(`  ${present.length}/${plan.kicks.length} planned kicks found: rise ${range(found.map((k) => k.riseDb))} dB, match ${range(found.map((k) => k.match))}, lag ${range(found.map((k) => k.lagMs))} ms`);
  console.log(`  ${quiet.length - strays.length}/${quiet.length} kick-free beats clean: rise ${range(quiet.map((k) => k.riseDb))} dB, match ${range(quiet.map((k) => k.match))}`);
  fail(missing.length === 0, `a kick on every planned beat${missing.length ? ` (missing ${missing.slice(0, 8).join(", ")})` : ""}`);
  fail(strays.length === 0, `no kick where the arrangement leaves it out${strays.length ? ` (found on ${strays.slice(0, 8).join(", ")})` : ""}`);
  // A tom tail or impact boom under a kick skews its correlation peak by about a millisecond.
  const late = present.filter((k) => Math.abs(k.lagMs) > 1.5);
  fail(late.length === 0, `every kick sits within 1.5 ms of its beat${late.length ? ` (${late.map((k) => `${k.b}: ${fmt(k.lagMs, 2)} ms`).join(", ")})` : ""}`);

  console.log("\nStereo and mono fold-down");
  const side = { l: new Float32Array(st.l.length), r: new Float32Array(st.l.length) };
  const mid = { l: new Float32Array(st.l.length), r: new Float32Array(st.l.length) };
  for (let k = 0; k < st.l.length; k++) {
    const m = 0.5 * (st.l[k] + st.r[k]);
    const s = 0.5 * (st.l[k] - st.r[k]);
    mid.l[k] = m;
    mid.r[k] = m;
    side.l[k] = s;
    side.r[k] = s;
  }
  const lowSide = run(side.l, lowPass());
  const lowMid = run(mid.l, lowPass());
  const energy = (x: Float32Array) => x.reduce((a, v) => a + v * v, 0);
  const sideBelow = 10 * Math.log10(energy(lowSide) / energy(lowMid));
  const sideAll = 10 * Math.log10(energy(side.l) / energy(mid.l));
  const monoLoss = meter.integrated - loudness(mid).integrated;
  console.log(`  side vs mid energy: ${fmt(sideAll)} dB overall, ${fmt(sideBelow)} dB under 120 Hz; mono fold-down is ${fmt(monoLoss, 2)} LU quieter`);
  fail(sideBelow <= -30, "mono under 120 Hz (side at least 30 dB under mid)");
  fail(monoLoss <= 1.5, "mono-compatible: the fold-down loses at most 1.5 LU");

  console.log("\nHook placement");
  for (const [a, b, label] of plan.hook) console.log(`  bars ${pad(a, 2)}-${pad(b, 2)}  ${pad(fmt(a * bar, 0), 2)}-${pad(fmt(b * bar, 0), 2)} s  ${label}`);

  console.log("\nHygiene");
  const clicks = [...findClicks(st.l), ...findClicks(st.r)].sort((a, b) => a - b);
  console.log(`  clicks (jump > 8x local level and > 0.003): ${clicks.length}${clicks.length ? ` at ${clicks.slice(0, 6).map((k) => fmt(k / SR, 4)).join(", ")} s` : ""}`);
  fail(clicks.length === 0, "no clicks or discontinuities");
  const win = Math.round(0.05 * SR);
  const gaps: number[] = [];
  for (let s = Math.round(0.1 * SR); s + win < (plan.finalHit + 4) * SR; s += win) {
    if (windowStats(st, s, s + win).rms < -60) gaps.push(s / SR);
  }
  fail(gaps.length === 0, `no 50 ms window under -60 dBFS before the outro${gaps.length ? ` (${gaps.slice(0, 5).map((t) => fmt(t, 2)).join(", ")} s)` : ""}`);
  console.log(`  first samples L/R: ${st.l[0].toFixed(6)} ${st.r[0].toFixed(6)}`);
  fail(Math.abs(st.l[0]) < 1e-4 && Math.abs(st.r[0]) < 1e-4, "starts from zero");
  const end = st.l.length;
  const endProfile: number[] = [];
  for (let i = 40; i > 0; i--) endProfile.push(windowStats(st, end - i * 0.1 * SR, end - (i - 1) * 0.1 * SR).rms);
  console.log(`  last 4 s in 100 ms windows (dBFS RMS): ${endProfile.map((x) => fmt(x, 0)).join(" ")}`);
  let lastSound = 0;
  const floor = Math.pow(10, -60 / 20);
  for (let k = end - 1; k >= 0; k--) {
    if (Math.abs(st.l[k]) > floor || Math.abs(st.r[k]) > floor) {
      lastSound = k;
      break;
    }
  }
  console.log(`  the tail falls under -60 dBFS for good at ${fmt(lastSound / SR, 3)} s`);
  fail(lastSound / SR <= plan.length - 0.1, "the tail is gone (< -60 dBFS) at least 100 ms before the end");
  fail(windowStats(st, end - 0.01 * SR, end).peak < -90, "the last 10 ms are digital silence");
  for (let i = 1; i < endProfile.length; i++) {
    if (endProfile[i] > endProfile[i - 1] + 3 && endProfile[i] > -45) problems.push(`level rises in the tail at ${fmt(plan.length - (40 - i) * 0.1, 1)} s`);
  }
  return problems;
}

export function analyzeSfx(name: string, st: Stereo, maxMs: number): string[] {
  const problems: string[] = [];
  const { rms, peak } = windowStats(st, 0, st.l.length);
  const ms = (st.l.length / SR) * 1000;
  let dc = 0;
  for (let k = 0; k < st.l.length; k++) dc += st.l[k];
  dc /= st.l.length;
  const first = Math.abs(st.l[0]);
  const last = Math.abs(st.l[st.l.length - 1]);
  console.log(
    `  ${name.padEnd(16)} ${pad(fmt(ms, 0), 4)} ms  peak ${pad(fmt(peak), 6)} dBFS  RMS ${pad(fmt(rms), 6)} dBFS  DC ${dc.toExponential(1)}  edges ${first.toFixed(5)}/${last.toFixed(5)}`,
  );
  if (ms > maxMs + 0.5) problems.push(`${name} is ${fmt(ms, 0)} ms`);
  if (peak > -11 || peak < -16) problems.push(`${name} peak ${fmt(peak)} dBFS`);
  if (first > 1e-3 || last > 1e-3) problems.push(`${name} does not start and end at zero`);
  if (findClicks(st.l).length) problems.push(`${name} has a click`);
  return problems;
}

/** The approval preview: exact length, untouched until a short fade at the very end. */
export function analyzePreview(preview: Stereo, full: Stereo, seconds: number, fadeMs: number): string[] {
  const problems: string[] = [];
  const n = Math.round(seconds * SR);
  const fade = Math.round((fadeMs / 1000) * SR);
  let maxDiff = 0;
  for (let k = 0; k < Math.min(n - fade, preview.l.length); k++) {
    maxDiff = Math.max(maxDiff, Math.abs(preview.l[k] - full.l[k]), Math.abs(preview.r[k] - full.r[k]));
  }
  const last = Math.max(Math.abs(preview.l[preview.l.length - 1]), Math.abs(preview.r[preview.r.length - 1]));
  console.log(`\nPreview: ${fmt(preview.l.length / SR, 3)} s, identical to the score until ${fmt(seconds - fadeMs / 1000, 3)} s (max diff ${maxDiff.toExponential(1)}), last sample ${last.toFixed(5)}`);
  if (preview.l.length !== n) problems.push(`preview is ${preview.l.length} samples, not ${n}`);
  if (maxDiff > 2 / 32767) problems.push("preview differs from the score before its end fade");
  if (last > 1e-3) problems.push("preview does not end at zero");
  return problems;
}
