/**
 * Original score and UI sounds for the PSA FAU Community Forum intro film: bright electronic pop
 * for a launch film, synthesised entirely in code (no samples).
 *
 *   npm run score               render public/audio/score.wav, sfx-*.wav and out/score-preview-0-30.wav, then measure
 *   npm run score -- --analyze  measure the files already on disk
 *
 * Tempo: 120 BPM in 4/4. A beat is 0.5 s, a bar 2 s, 44 bars 88 s. Bars count from 0, as in the
 * scene table of src/lib/timeline.ts; the chat's message beats come from src/lib/chat-beats.ts.
 *
 * Key: D major. Progression: vi-IV-I-V (Bm G D A), a chord a bar, restarting on Bm on every scene
 * cut so each scene opens with the same lift. Five-bar scenes end on a half-bar turnaround (G-A, or
 * Em7-A into "Both sides"). The loop passes through D but never rests there until the final hit.
 *
 * The hook (16th grid, a 3+3+2 tresillo rhythm), on the lead at the drop and the peak:
 *
 *   Bm | F#5 . . F#5 . . A5 . B5 . . A5  . . F#5 . |
 *   G  | E5  . . D5  . . E5 . .  . . -   - - D5  . |
 *   D  | F#5 . . F#5 . . A5 . D6 . . C#6 . . A5  . |
 *   A  | B5  . . A5  . . E5 . .  . . -   - - -   - |
 *
 * It climbs to D6 and ends open on E5, so it always asks to go round again. At the peak its last
 * bar climbs instead (B5 C#6 D6 E6 C#6); the end-card tag (A5 B5 A5 F#5 | E5 D5) finally answers
 * it on the tonic. The notification pops are pitched to the chord
 * under each message: the RP question is always B5 and its answer D6, in the chat and again in
 * the breakdown.
 *
 * | bars  | time s | scene            | harmony            | music
 * |-------|--------|------------------|--------------------|-----------------------------------------------------------
 * | 0-6   | 0-12   | The noise        | Bm G D A Bm-G Asus2| an eighth-note gated supersaw pulse under a low-pass that opens
 * |       |        |                  |                    | slowly; a muffled kick from bar 2; a muted arp (eighths, then
 * |       |        |                  |                    | sixteenths in bar 4); a pop on every message beat, so the chat is
 * |       |        |                  |                    | the rhythm; THE riser and a snare build in bar 5, cut at 11.75 s
 * |       |        |                  |                    | for a quarter-second breath
 * | 6-10  | 12-20  | One place        | Bm G D A           | THE DROP on 12.000 s: crash, impact, four-on-the-floor kick,
 * |       |        |                  |                    | layered claps, off-beat hats, sub, pumping supersaws, plucked arp
 * |       |        |                  |                    | and THE HOOK; a reverse swell into bar 10
 * | 10-15 | 20-30  | Search           | loop, G-A          | the hook rests; a syncopated arp and a 16th shaker; tom fill into
 * |       |        |                  |                    | bar 15
 * | 15-19 | 30-38  | The answer       | loop               | a falling glass-bell counter-line; an open hat on the "and" of
 * |       |        |                  |                    | four; a clap roll and swell into bar 19
 * | 19-24 | 38-48  | Ask              | loop, Em7-A        | wordless "ah/oh" chops answer the arp; off-beat bass stabs; a snare
 * |       |        |                  |                    | under the clap; the band stops on the last eighth while a chop and a
 * |       |        |                  |                    | swell carry the cut
 * | 24-29 | 48-58  | Both sides       | loop, G-A          | a call on the left (lead) answered on the right (chops); the arp
 * |       |        |                  |                    | climbs an octave, open hats on every off-beat; kick out and a snare
 * |       |        |                  |                    | roll into bar 29
 * | 29-33 | 58-66  | Start here       | loop               | THE HOOK again on glass bell and pluck, lighter: a softer kit and the
 * |       |        |                  |                    | chords 5 dB down behind a darker filter; a bar-long snare build
 * | 33-37 | 66-74  | Everything else  | loop               | the peak: THE HOOK on the lead with an octave below and the bell
 * |       |        |                  |                    | above, its last bar lifted to E6; chops answering it; top-octave
 * |       |        |                  |                    | supersaws, 16th hats, open hats, stabs; a swell into bar 37
 * | 37-40 | 74-80  | Back to the chat | Bm G Asus4-A       | breakdown: the filter closes over two beats and the kick drops out;
 * |       |        |                  |                    | a muted arp and soft pops on the calm messages; the filter reopens
 * |       |        |                  |                    | in bar 39, a snare and a swell, then a sixteenth's breath
 * | 40-44 | 80-88  | End card         | D                  | THE FINAL HIT on 80.000 s, on D: kick, clap, crash, impact, the full
 * |       |        |                  |                    | chord, lead D6 and a sung "ah" chord; the tag resolves to D5 at
 * |       |        |                  |                    | 82.5 s and rings out; the tail is gone by about 86.5 s
 *
 * Something new arrives at least every five bars, and every cut (bars 10, 15, 19, 24, 29, 33, 37,
 * 40) has its own fill or sweep, so the four-bar loop never sounds like a loop.
 *
 * Mix for laptop and phone speakers: the kick ducks the bass by 24 dB and the supersaws by 11 dB
 * (the pump), keeping the low end clear; the sub is mono and saturated, doubled an octave up so
 * the bass line reads without a woofer; the supersaws are high-passed at 240 Hz so the low mids
 * stay clean; the hook sits in 1-4 kHz with the 4-6 kHz edge taken off; one short plate (RT60
 * 1.1 s) and a dotted-eighth ping-pong delay that stays out of the downbeats. Master: a gentle
 * tilt, mono under 120 Hz, glue compression, a look-ahead limiter, -14 LUFS at no more than
 * -1 dBTP.
 */
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CALM_MESSAGES, NOISE_MESSAGES } from "../src/lib/chat-beats.ts";
import { BEAT_SECONDS, BEATS_PER_BAR, BPM, SCENES } from "../src/lib/timeline.ts";
import { BAND_LABELS, analyzePreview, analyzeScore, analyzeSfx, bandShares, findClicks, type ScorePlan } from "./audio/analyze.ts";
import { Biquad, SR, type Stereo, addPanned, fromDb, mixInto, scale, smooth, stereo, toDb } from "./audio/dsp.ts";
import { clap, crash, downlifter, hat, impact, kick, riser, shaker, snare, swell, tom, type KickOptions } from "./audio/drums.ts";
import { applyGain, dbCurve, eq, eqMono, gateCurve, lowpassSweep, monoBelow, monoToStereo, multiply, muteCurve, pingPong, pumpCurve, saturate, type PumpShape } from "./audio/fx.ts";
import { loudness, truePeakDb } from "./audio/loudness.ts";
import { compress, limit } from "./audio/master.ts";
import { reverb } from "./audio/reverb.ts";
import { rng, seedOf } from "./audio/rng.ts";
import { renderSfx } from "./audio/sfx.ts";
import {
  bells,
  chops,
  lead,
  plucks,
  pops,
  subBass,
  supersaw,
  type BassNote,
  type BellNote,
  type ChopNote,
  type ChordNote,
  type LeadNote,
  type PluckNote,
  type Pop,
  type Vowel,
} from "./audio/synth.ts";
import { readWav, writeWav } from "./audio/wav.ts";

// ---------------------------------------------------------------- grid

const BEAT = BEAT_SECONDS;
const BAR = BEAT * BEATS_PER_BAR;
const STEP = BEAT / 4;
const BARS = SCENES[SCENES.length - 1].endBar;
const SECONDS = BARS * BAR;
const LENGTH = Math.round(SECONDS * SR);
const TARGET_LUFS = -14;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "audio");
const PREVIEW = join(ROOT, "out", "score-preview-0-30.wav");
const PREVIEW_SECONDS = 30;

/** Seconds at a bar plus 16th-note steps. */
const at = (bar: number, step = 0): number => bar * BAR + step * STEP;
const beatAt = (beat: number): number => beat * BEAT;

/** The arrangement is written against this scene table; a changed timeline must change the score too. */
const EXPECTED_BARS = [0, 6, 10, 15, 19, 24, 29, 33, 37, 40, 44];
const sceneBars = [...SCENES.map((s) => s.startBar), BARS];
if (BPM !== 120 || BEATS_PER_BAR !== 4 || sceneBars.join() !== EXPECTED_BARS.join()) {
  throw new Error(`The score is arranged for 120 BPM and scene bars ${EXPECTED_BARS.join(", ")}; the timeline has ${BPM} BPM and ${sceneBars.join(", ")}`);
}
const DROP = at(6);
const HIT = at(40);
type KickKind = "muffled" | "full" | "hit";
const KICK: KickOptions = { f0: 230, f1: 53, pitchTau: 0.024, decay: 0.27, length: 0.42, click: 0.5, drive: 1.9, gain: 1, seed: 1 };

/** The chat's kick is heard through a wall; the final hit's is longer and harder. */
function kickOptions(kind: KickKind, vel: number): KickOptions {
  if (kind === "muffled") return { ...KICK, click: 0, drive: 1.4, gain: vel };
  if (kind === "hit") return { ...KICK, f0: 260, decay: 0.55, length: 1.1, drive: 2.2, gain: 1.1 * vel };
  return { ...KICK, gain: vel };
}
const muffle = () => [Biquad.of("lowpass", 320, 0.9), Biquad.of("lowpass", 320, 0.7)];
const RISER: [number, number] = [at(5), at(5, 14)];

// ---------------------------------------------------------------- harmony

type ChordName = "Bm" | "G" | "D" | "A" | "Em7" | "Asus2" | "Asus4";
/** MIDI: sub-bass root, supersaw voicing (kept above F#4 so the chords never thicken the low mids), arp pool low to high. */
type Chord = { root: number; saw: number[]; arp: number[] };

const CHORDS: Record<ChordName, Chord> = {
  Bm: { root: 35, saw: [66, 69, 71, 74], arp: [59, 62, 66, 71, 74, 78, 83] },
  G: { root: 31, saw: [67, 71, 74], arp: [55, 59, 62, 67, 71, 74, 79] },
  D: { root: 38, saw: [66, 69, 74], arp: [62, 66, 69, 74, 78, 81, 86] },
  A: { root: 33, saw: [64, 69, 73], arp: [57, 61, 64, 69, 73, 76, 81] },
  Em7: { root: 40, saw: [64, 67, 71, 74], arp: [64, 67, 71, 76, 79, 83, 88] },
  Asus2: { root: 33, saw: [64, 69, 71], arp: [57, 59, 64, 69, 71, 76, 81] },
  Asus4: { root: 33, saw: [64, 69, 74], arp: [57, 62, 64, 69, 74, 76, 81] },
};

/**
 * [bar, chord]: vi-IV-I-V (Bm G D A) restarting on every scene cut; five-bar scenes end on a
 * turnaround. Under the riser the V hangs as Asus2, its B resolving into the drop's Bm.
 */
const HARMONY: [number, ChordName][] = [
  [0, "Bm"], [1, "G"], [2, "D"], [3, "A"], [4, "Bm"], [4.5, "G"], [5, "Asus2"],
  [6, "Bm"], [7, "G"], [8, "D"], [9, "A"],
  [10, "Bm"], [11, "G"], [12, "D"], [13, "A"], [14, "G"], [14.5, "A"],
  [15, "Bm"], [16, "G"], [17, "D"], [18, "A"],
  [19, "Bm"], [20, "G"], [21, "D"], [22, "A"], [23, "Em7"], [23.5, "A"],
  [24, "Bm"], [25, "G"], [26, "D"], [27, "A"], [28, "G"], [28.5, "A"],
  [29, "Bm"], [30, "G"], [31, "D"], [32, "A"],
  [33, "Bm"], [34, "G"], [35, "D"], [36, "A"],
  [37, "Bm"], [38, "G"], [39, "Asus4"], [39.5, "A"],
  [40, "D"],
];

type Segment = { from: number; to: number; name: ChordName; chord: Chord };
const SEGMENTS: Segment[] = HARMONY.map(([from, name], i) => ({ from, to: i + 1 < HARMONY.length ? HARMONY[i + 1][0] : BARS, name, chord: CHORDS[name] }));

function chordAt(bar: number): Chord {
  const seg = SEGMENTS.find((s) => bar >= s.from - 1e-9 && bar < s.to - 1e-9);
  if (!seg) throw new Error(`No chord at bar ${bar}`);
  return seg.chord;
}

function segments(fromBar: number, toBar: number): Segment[] {
  return SEGMENTS.filter((s) => s.to > fromBar && s.from < toBar).map((s) => ({ ...s, from: Math.max(s.from, fromBar), to: Math.min(s.to, toBar) }));
}

for (const s of SCENES.slice(1, -1)) {
  if (!HARMONY.some(([b, name]) => b === s.startBar && name === "Bm")) throw new Error(`Scene ${s.title} does not restart the loop on Bm`);
}

// ---------------------------------------------------------------- melodies ([16th step, length in steps, MIDI] per bar)

type Line = [number, number, number][][];

/** THE HOOK, over Bm G D A: a tresillo (3+3+2) figure that climbs to D6 and lands open on E5. */
const HOOK: Line = [
  [[0, 3, 78], [3, 3, 78], [6, 2, 81], [8, 3, 83], [11, 3, 81], [14, 2, 78]],
  [[0, 3, 76], [3, 3, 74], [6, 6, 76], [14, 2, 74]],
  [[0, 3, 78], [3, 3, 78], [6, 2, 81], [8, 3, 86], [11, 3, 85], [14, 2, 81]],
  [[0, 3, 83], [3, 3, 81], [6, 6, 76]],
];

/** "The answer": a falling bell line in dotted quarters under the groove. */
const COUNTER: Line = [
  [[0, 6, 86], [6, 6, 85], [12, 4, 83]],
  [[0, 6, 86], [6, 6, 83], [12, 4, 79]],
  [[0, 6, 81], [6, 6, 78], [12, 4, 81]],
  [[0, 6, 85], [6, 6, 88], [12, 4, 85]],
];

/** "Both sides": a call on the left (member) answered by the voices on the right (moderator). */
const CALL: Line = [
  [[2, 2, 78], [4, 2, 81], [6, 4, 83], [10, 2, 81], [12, 4, 78]],
  [],
  [[2, 2, 81], [4, 2, 83], [6, 4, 86], [10, 2, 85], [12, 4, 81]],
  [],
];
const ANSWER: Line = [
  [],
  [[2, 2, 74], [4, 2, 76], [6, 4, 79], [10, 2, 78], [12, 4, 74]],
  [],
  [[2, 2, 76], [4, 2, 78], [6, 4, 81], [10, 2, 83], [12, 4, 85]],
];

/** At the peak the hook's last bar climbs to E6 instead of falling back to E5. */
const PEAK_HOOK: Line = [...HOOK.slice(0, 3), [[0, 3, 83], [3, 3, 85], [6, 2, 86], [8, 4, 88], [12, 4, 85]]];

/** End-card tag after the final hit: the hook's figure falling home to D. */
const TAG: Line = [
  [[8, 2, 81], [10, 2, 83], [12, 2, 81], [14, 2, 78]],
  [[0, 4, 76], [4, 12, 74]],
];

/** Arp patterns: indexes into the chord's pool, -1 rests. */
const ARP = {
  chat: [1, -1, 2, -1, 3, -1, 2, -1, 1, -1, 2, -1, 3, -1, 4, -1],
  chatFast: [1, 2, 3, 2, 1, 2, 3, 4, 1, 2, 3, 2, 3, 4, 5, 4],
  drop: [3, 2, 4, 2, 5, 2, 4, 2, 3, 2, 4, 2, 5, 4, 3, 2],
  search: [3, -1, 4, 3, -1, 5, 4, -1, 3, 4, -1, 5, 4, -1, 3, 2],
  answer: [3, 2, 4, 2, 5, 2, 4, 6, 3, 2, 4, 2, 5, 6, 5, 4],
  ask: [4, -1, 3, 4, -1, 5, 4, -1, 6, 5, -1, 4, 5, -1, 3, 4],
  high: [4, 5, 6, 5, 4, 5, 3, 4, 5, 6, 5, 4, 3, 4, 5, 6],
};

/** Notification pops, pitched to the chord under each message: the RP question is always B5, its answer D6. */
const POP_NOTES: Record<number, number> = {
  0: 78, 3: 83, 6: 86, 9: 81, 10: 78, 11: 86, 12: 85, 13: 81, 13.5: 88, 14: 85, 14.5: 81, 15: 76, 15.5: 81,
  16: 83, 19: 86, 20: 88, 20.5: 83,
};
const CALM_NOTES: Record<number, number> = { 150: 83, 154: 86, 156: 81, 157: 88 };

// ---------------------------------------------------------------- events

const ev = {
  kicks: [] as { t: number; kind: KickKind; vel: number }[],
  claps: [] as { t: number; vel: number }[],
  snares: [] as { t: number; vel: number; pan: number }[],
  hats: [] as { t: number; vel: number; open: boolean; pan: number }[],
  shakers: [] as { t: number; vel: number }[],
  crashes: [] as { t: number; vel: number; decay?: number }[],
  toms: [] as { t: number; freq: number; vel: number; pan: number }[],
  swells: [] as { end: number; length: number; vel: number }[],
  downlifters: [] as { t: number; length: number; vel: number }[],
  impacts: [] as { t: number; vel: number }[],
  pulse: [] as ChordNote[],
  chords: [] as ChordNote[],
  chordsTop: [] as ChordNote[],
  arp: [] as PluckNote[],
  arpMuted: [] as PluckNote[],
  sub: [] as BassNote[],
  bassMid: [] as PluckNote[],
  stabs: [] as PluckNote[],
  lead: [] as LeadNote[],
  leadLow: [] as LeadNote[],
  call: [] as LeadNote[],
  bell: [] as BellNote[],
  hookPluck: [] as PluckNote[],
  chops: [] as ChopNote[],
  pops: [] as Pop[],
  calmPops: [] as Pop[],
  /** Breaths where the band stops: before the drop, the "stop" into Both sides, before the final hit. */
  mutes: [] as [number, number][],
};

/** Problems found while rendering (per-stem continuity), reported with the file checks. */
const renderProblems: string[] = [];

/** Beats where the groove leaves the kick out for a fill. */
const KICK_OUT = new Set([59, 114, 115, 131]);
const CLAP_OUT = new Set([59, 75, 115, 129, 131]);

function chordsFor(list: ChordNote[], fromBar: number, toBar: number, gain: number, transpose = 0, top = false): void {
  for (const s of segments(fromBar, toBar)) {
    const notes = top ? s.chord.saw.slice(-2) : s.chord.saw;
    for (const midi of notes) list.push({ t: at(s.from), end: at(s.to), midi: midi + transpose, gain });
  }
}

function arp(list: PluckNote[], fromBar: number, toBar: number, pattern: number[], vel: number): void {
  for (let bar = fromBar; bar < toBar; bar++) {
    for (let s = 0; s < 16; s++) {
      const idx = pattern[s];
      if (idx < 0) continue;
      const accent = s % 4 === 0 ? 1 : s % 2 === 0 ? 0.84 : 0.7;
      list.push({ t: at(bar, s), dur: STEP * 0.85, midi: chordAt(bar + s / 16).arp[idx], vel: vel * accent, pan: s % 2 ? 0.2 : -0.2 });
    }
  }
}

function bass(fromBar: number, toBar: number, vel: number, mid = 1): void {
  for (const s of segments(fromBar, toBar)) {
    ev.sub.push({ t: at(s.from), end: at(s.to), midi: s.chord.root, vel });
    if (mid > 0) ev.bassMid.push({ t: at(s.from), dur: at(s.to) - at(s.from) - 0.01, midi: s.chord.root + 12, vel: mid });
  }
}

function stabs(fromBar: number, toBar: number, vel: number): void {
  for (let bar = fromBar; bar < toBar; bar++) {
    for (const s of [2, 6, 10, 14]) ev.stabs.push({ t: at(bar, s), dur: 0.09, midi: chordAt(bar + s / 16).root + 12, vel: vel * (s === 14 ? 0.85 : 1) });
  }
}

function line(startBar: number, phrase: Line, each: (t: number, dur: number, midi: number, barIndex: number) => void): void {
  phrase.forEach((notes, i) => notes.forEach(([step, len, midi]) => each(at(startBar + i, step), len * STEP, midi, i)));
}

type GrooveOptions = { kick?: number; clap: number; hat: number; open?: "and4" | "offbeat"; shaker?: number; hats16?: number; snareLayer?: number };

/** Four on the floor, claps on 2 and 4, hats on the off-beats, plus the section's extras. */
function groove(fromBar: number, toBar: number, o: GrooveOptions): void {
  for (let bar = fromBar; bar < toBar; bar++) {
    for (let b = 0; b < 4; b++) {
      const beat = bar * 4 + b;
      const t = beatAt(beat);
      if (!KICK_OUT.has(beat)) ev.kicks.push({ t, kind: "full", vel: o.kick ?? 1 });
      if (b % 2 === 1 && !CLAP_OUT.has(beat)) {
        ev.claps.push({ t, vel: o.clap });
        if (o.snareLayer) ev.snares.push({ t, vel: o.snareLayer, pan: 0 });
      }
      const open = o.open === "offbeat" || (o.open === "and4" && b === 3);
      ev.hats.push({ t: t + BEAT / 2, vel: o.hat * (open ? 0.8 : b % 2 ? 1 : 0.86), open, pan: 0.12 });
      if (o.hats16) for (const s of [1, 3]) ev.hats.push({ t: t + s * STEP, vel: o.hats16 * (s === 3 ? 0.8 : 1), open: false, pan: -0.2 });
      if (o.shaker) for (let s = 0; s < 4; s++) ev.shakers.push({ t: t + s * STEP, vel: o.shaker * [0.55, 0.8, 0.65, 1][s] });
    }
  }
}

function compose(): void {
  // 1 The noise (bars 0-6): a filtered, gated pulse; the notification pops are the rhythm.
  chordsFor(ev.pulse, 0, 5.875, 1);
  arp(ev.arpMuted, 2, 4, ARP.chat, 0.75);
  arp(ev.arpMuted, 4, 5, ARP.chatFast, 0.8);
  for (let s = 0; s < 14; s++) {
    ev.arpMuted.push({ t: at(5, s), dur: STEP * 0.85, midi: chordAt(5).arp[ARP.chatFast[s]], vel: 0.6 + 0.4 * (s / 14), pan: s % 2 ? 0.2 : -0.2 });
  }
  for (let beat = 8; beat < 24; beat++) ev.kicks.push({ t: beatAt(beat), kind: "muffled", vel: 1 });
  [21, 22, 22.5, 23, 23.25].forEach((beat, i) => ev.snares.push({ t: beatAt(beat), vel: 0.35 + 0.12 * i, pan: 0 }));
  ev.mutes.push([RISER[1], DROP]);
  NOISE_MESSAGES.forEach((m, i) => {
    const midi = POP_NOTES[m.beat];
    if (midi === undefined) throw new Error(`No pop pitch for the message on beat ${m.beat}`);
    const r = rng(seedOf(203, i));
    const hurry = Math.min(1, m.beat / 16);
    const pop: Pop = {
      t: beatAt(m.beat),
      midi,
      vel: 0.82 + 0.12 * r() + 0.08 * hurry,
      pan: (r() * 2 - 1) * 0.38,
      glide: 4 + 5 * r(),
      glideTau: 0.004 + 0.005 * r(),
      decay: 0.09 - 0.04 * hurry + 0.02 * r(),
      partial: 0.08 + 0.2 * r(),
      click: 0.45 + 0.15 * r(),
      seed: i,
    };
    ev.pops.push(pop);
    if (m.message.includes("reaction")) ev.pops.push({ ...pop, t: pop.t + 0.055, midi: midi + 5, vel: pop.vel * 0.6, decay: 0.05, seed: i + 100 });
  });

  // 2 One place (bars 6-10): THE DROP on 12.000 s, the hook enters.
  ev.crashes.push({ t: DROP, vel: 1 });
  ev.impacts.push({ t: DROP, vel: 1 });
  ev.downlifters.push({ t: DROP, length: 2.5, vel: 0.8 });
  groove(6, 10, { clap: 0.9, hat: 0.85 });
  bass(6, 10, 1);
  chordsFor(ev.chords, 6, 10, 1);
  arp(ev.arp, 6, 10, ARP.drop, 0.8);
  line(6, HOOK, (t, dur, midi) => ev.lead.push({ t, dur: dur * 0.86, midi, vel: 1 }));
  ev.swells.push({ end: at(10), length: BEAT * 2, vel: 0.7 });

  // 3 Search (bars 10-15): the hook rests; a syncopated arp and a shaker take over.
  ev.crashes.push({ t: at(10), vel: 0.7 });
  groove(10, 15, { clap: 0.85, hat: 0.8, shaker: 0.7 });
  bass(10, 15, 1);
  chordsFor(ev.chords, 10, 15, 0.95);
  arp(ev.arp, 10, 15, ARP.search, 0.85);
  [233, 196, 165, 139].forEach((freq, i) => ev.toms.push({ t: beatAt(59 + i / 4), freq, vel: 0.75 + 0.08 * i, pan: 0.4 - 0.27 * i }));

  // 4 The answer (bars 15-19): a falling bell counter-line, an open hat on the "and" of four.
  ev.crashes.push({ t: at(15), vel: 0.75 });
  groove(15, 19, { clap: 0.85, hat: 0.8, shaker: 0.7, open: "and4" });
  bass(15, 19, 1);
  chordsFor(ev.chords, 15, 19, 0.95);
  arp(ev.arp, 15, 19, ARP.answer, 0.8);
  line(15, COUNTER, (t, dur, midi) => ev.bell.push({ t, dur: dur * 0.9, midi, vel: 0.85, pan: -0.1 }));
  [0, 0.25, 0.5, 0.75].forEach((s, i) => ev.claps.push({ t: beatAt(75 + s), vel: 0.45 + 0.15 * i }));
  ev.swells.push({ end: at(19), length: BEAT, vel: 0.6 });

  // 5 Ask (bars 19-24): vocal chops answer the arp, the bass starts bouncing on the off-beats.
  ev.crashes.push({ t: at(19), vel: 0.75 });
  groove(19, 24, { clap: 0.85, hat: 0.85, shaker: 0.75, open: "and4", snareLayer: 0.35 });
  bass(19, 23.875, 1);
  stabs(19, 24, 0.8);
  chordsFor(ev.chords, 19, 23.875, 1);
  arp(ev.arp, 19, 24, ARP.ask, 0.8);
  const vox = (t: number, dur: number, midi: number, from: Vowel, to: Vowel, pan: number, vel = 0.9) => ev.chops.push({ t, dur, midi, vel, from, to, pan });
  for (const [bar, pitches] of [[20, [71, 74, 79]], [22, [73, 76, 81]]] as [number, number[]][]) {
    vox(at(bar, 8), 2 * STEP * 0.8, pitches[0], "ah", "ah", 0.1);
    vox(at(bar, 10), 2 * STEP * 0.8, pitches[1], "oh", "oh", 0.1);
    vox(at(bar, 12), 4 * STEP * 0.9, pitches[2], "ah", "oh", 0.1);
  }
  ev.mutes.push([at(23, 14), at(24)]);
  vox(at(23, 14), 2 * STEP * 0.95, 76, "oh", "ah", 0);
  ev.swells.push({ end: at(24), length: BEAT, vel: 0.7 });

  // 6 Both sides (bars 24-29): call on the left, answer on the right; the arp climbs an octave.
  ev.crashes.push({ t: at(24), vel: 0.8 });
  groove(24, 29, { clap: 0.85, hat: 0.85, shaker: 0.75, open: "offbeat", snareLayer: 0.35 });
  bass(24, 29, 1);
  stabs(24, 29, 0.85);
  chordsFor(ev.chords, 24, 29, 1);
  arp(ev.arp, 24, 29, ARP.high, 0.7);
  line(24, CALL, (t, dur, midi) => ev.call.push({ t, dur: dur * 0.85, midi, vel: 0.95 }));
  // Long notes open from "ah" to "oh" like a held syllable; short ones are a quick "oh-ah".
  line(24, ANSWER, (t, dur, midi) => (dur >= 4 * STEP ? vox(t, dur * 0.85, midi, "ah", "oh", 0.55) : vox(t, dur * 0.85, midi, "oh", "ah", 0.55)));
  [114, 114.5, 115, 115.25, 115.5, 115.75].forEach((beat, i) => ev.snares.push({ t: beatAt(beat), vel: 0.4 + 0.1 * i, pan: 0 }));
  ev.swells.push({ end: at(29), length: BEAT * 2, vel: 0.8 });

  // 7 Start here (bars 29-33): the hook again, lighter: glassy bell and a pluck instead of the lead.
  ev.crashes.push({ t: at(29), vel: 0.6 });
  groove(29, 33, { kick: 0.8, clap: 0.6, hat: 0.55 });
  bass(29, 33, 0.85, 0.6);
  chordsFor(ev.chords, 29, 33, 0.9);
  arp(ev.arp, 29, 33, ARP.drop, 0.5);
  line(29, HOOK, (t, dur, midi) => {
    ev.bell.push({ t, dur: dur * 0.9, midi, vel: 0.8, pan: 0 });
    ev.hookPluck.push({ t, dur: dur * 0.8, midi, vel: 1, pan: 0 });
  });
  for (let beat = 128; beat < 132; beat += beat < 130 ? 0.5 : 0.25) ev.snares.push({ t: beatAt(beat), vel: 0.3 + 0.55 * ((beat - 128) / 4), pan: 0 });
  ev.swells.push({ end: at(33), length: BEAT * 2, vel: 0.9 });

  // 8 Everything else (bars 33-37): the peak, everything in.
  ev.crashes.push({ t: at(33), vel: 1 });
  ev.impacts.push({ t: at(33), vel: 0.8 });
  groove(33, 37, { clap: 1, hat: 0.9, shaker: 0.8, open: "offbeat", hats16: 0.45, snareLayer: 0.45 });
  bass(33, 37, 1);
  stabs(33, 37, 0.9);
  chordsFor(ev.chords, 33, 37, 1);
  chordsFor(ev.chordsTop, 33, 37, 1, 12, true);
  arp(ev.arp, 33, 37, ARP.high, 0.8);
  line(33, PEAK_HOOK, (t, dur, midi) => {
    ev.lead.push({ t, dur: dur * 0.86, midi, vel: 1 });
    ev.leadLow.push({ t, dur: dur * 0.86, midi: midi - 12, vel: 1 });
    ev.bell.push({ t, dur: dur * 0.9, midi: midi + 12, vel: 0.35, pan: 0.2 });
  });
  vox(at(34, 12), 2 * STEP * 0.85, 79, "oh", "oh", -0.3);
  vox(at(36, 8), 4 * STEP * 0.9, 85, "ah", "oh", 0.3);
  ev.swells.push({ end: at(37), length: BEAT * 2, vel: 0.7 });

  // 9 Back to the chat (bars 37-40): breakdown. The filter closes, the kick drops out, soft pops.
  ev.crashes.push({ t: at(37), vel: 0.35, decay: 0.3 });
  ev.downlifters.push({ t: at(37), length: BEAT * 2, vel: 0.4 });
  chordsFor(ev.chords, 37, 39.9375, 0.9);
  arp(ev.arpMuted, 37, 40, ARP.chat, 0.65);
  for (const s of segments(37, 39.9375)) ev.sub.push({ t: at(s.from), end: at(s.to), midi: s.chord.root, vel: 0.4 });
  CALM_MESSAGES.forEach((m, i) => {
    const midi = CALM_NOTES[m.beat];
    if (midi === undefined) throw new Error(`No pop pitch for the calm message on beat ${m.beat}`);
    ev.calmPops.push({ t: beatAt(m.beat), midi, vel: 0.9, pan: i % 2 ? 0.25 : -0.2, glide: 3, glideTau: 0.006, decay: 0.13, partial: 0.12, click: 0.75, seed: 500 + i });
  });
  [159, 159.25, 159.5].forEach((beat, i) => ev.snares.push({ t: beatAt(beat), vel: 0.45 + 0.2 * i, pan: 0 }));
  ev.swells.push({ end: beatAt(159.75), length: 1.2, vel: 0.9 });
  ev.mutes.push([beatAt(159.75), HIT]);

  // 10 End card (bars 40-44): the final hit on D, the tag falls home, a clean tail.
  ev.kicks.push({ t: HIT, kind: "hit", vel: 1 });
  ev.claps.push({ t: HIT, vel: 1 });
  ev.crashes.push({ t: HIT, vel: 1.1 });
  ev.impacts.push({ t: HIT, vel: 1 });
  for (const midi of [62, 66, 69, 74, 78, 81]) ev.chords.push({ t: HIT, end: at(43), midi, gain: 0.9 });
  ev.sub.push({ t: HIT, end: at(40, 6), midi: 38, vel: 1 });
  ev.bassMid.push({ t: HIT, dur: 1.4, midi: 50, vel: 1 });
  ev.lead.push({ t: HIT, dur: 1.1, midi: 86, vel: 1 });
  ev.leadLow.push({ t: HIT, dur: 1.1, midi: 74, vel: 1 });
  for (const midi of [74, 78, 81]) vox(HIT, 0.75, midi, "ah", "oh", 0, 0.55);
  line(40, TAG, (t, dur, midi, i) => ev.bell.push({ t, dur: i === 1 && dur > 1 ? 3.4 : dur * 0.9, midi, vel: 0.95, pan: 0 }));
}

// ---------------------------------------------------------------- render

/** Ungated K-weighted loudness of a stem between two times. */
function lufsOf(st: Stereo, from: number, to: number): number {
  return loudness(st).range(from * SR, to * SR);
}

function oneShots(render: (bus: Stereo) => void): Stereo {
  const bus = stereo(LENGTH);
  render(bus);
  return bus;
}

function render(): Stereo {
  const muted = muteCurve(LENGTH, ev.mutes);
  const full = ev.kicks.filter((k) => k.kind === "full").map((k) => k.t);
  const pump = (s: PumpShape) => pumpCurve(LENGTH, full, s);
  const pumps = {
    bass: pumpCurve(LENGTH, [...full, HIT], { depthDb: -24, attackMs: 2, holdMs: 30, releaseMs: 140, lookaheadMs: 2 }),
    chords: pump({ depthDb: -11, attackMs: 3, holdMs: 12, releaseMs: 290, lookaheadMs: 1 }),
    arp: pump({ depthDb: -6, attackMs: 3, holdMs: 10, releaseMs: 220, lookaheadMs: 1 }),
    lead: pump({ depthDb: -2.5, attackMs: 3, holdMs: 5, releaseMs: 160, lookaheadMs: 1 }),
    soft: pump({ depthDb: -4, attackMs: 3, holdMs: 5, releaseMs: 200, lookaheadMs: 1 }),
    returns: pump({ depthDb: -6, attackMs: 4, holdMs: 10, releaseMs: 260, lookaheadMs: 0 }),
  };
  const dry = stereo(LENGTH);
  const toReverb = stereo(LENGTH);
  const toDelay = stereo(LENGTH);
  const spectra: string[] = [];
  /** Where a stem's energy sits, for the claims that matter on small speakers. */
  const spectrum = (name: string, st: Stereo, [from, to]: [number, number], focus: [string, number[]]) => {
    const shares = bandShares(st, from * SR, to * SR);
    const share = focus[1].reduce((a, i) => a + shares[i], 0);
    spectra.push(`  ${name.padEnd(20)} ${shares.map((x) => x.toFixed(1).padStart(6)).join(" ")}   ${focus[0]} ${share.toFixed(0)} %`);
  };
  console.log("Stems (gain into the mix, loudness where balanced)");
  /** Balances a stem to its loudness inside the window where it carries the music, then mixes it. */
  const add = (name: string, st: Stereo, window: [number, number], target: number, reverbSend: number, delaySend: number, mute = true) => {
    const g = fromDb(target - lufsOf(st, ...window));
    scale(st, g);
    if (mute) applyGain(st, muted);
    mixInto(dry, st, 1);
    if (reverbSend) mixInto(toReverb, st, reverbSend);
    if (delaySend) mixInto(toDelay, st, delaySend);
    // A stem on its own is sparse, so a discontinuity from a voice shows here long before the mix would
    // hide it. Supersaw stacks are left out: several band-limited saw edges landing together are a
    // legitimate steep drop that this first-difference test cannot tell from a click.
    const sawStack = name.startsWith("chords") || name === "chat pulse";
    const clicks = sawStack ? [] : [...findClicks(st.l), ...findClicks(st.r)];
    if (clicks.length) renderProblems.push(`${name}: ${clicks.length} possible clicks, first at ${(Math.min(...clicks) / SR).toFixed(4)} s`);
    console.log(`  ${name.padEnd(20)} ${toDb(g).toFixed(1).padStart(6)} dB  ${target.toFixed(1)} LUFS over ${window[0].toFixed(1)}-${window[1].toFixed(1)} s  ${sawStack ? "" : `clicks ${clicks.length}`}`);
  };
  const groove: [number, number] = [at(10), at(29)];

  // Drums
  const kicks = new Float32Array(LENGTH);
  const muffled = new Float32Array(LENGTH);
  for (const k of ev.kicks) kick(k.kind === "muffled" ? muffled : kicks, k.t, kickOptions(k.kind, k.vel));
  eqMono(muffled, muffle);
  add("kick", monoToStereo(kicks), groove, -15, 0, 0);
  add("kick, muffled", monoToStereo(muffled), [at(2), RISER[1]], -27.5, 0.05, 0);
  add("clap", oneShots((bus) => ev.claps.forEach((c, i) => clap(bus, c.t, { gain: c.vel, tail: 0.075, bright: 1, seed: i }))), groove, -21, 0.2, 0);
  const snares = oneShots((bus) => ev.snares.forEach((s, i) => snare(bus, s.t, { gain: s.vel, pan: s.pan, seed: i })));
  eq(snares, () => [Biquad.of("highpass", 140, 0.7)]);
  add("snare", snares, [at(32), at(33)], -21, 0.2, 0);
  const hats = oneShots((bus) => ev.hats.forEach((h, i) => hat(bus, h.t, { decay: h.open ? 0.11 : 0.03, gain: h.vel * (h.open ? 0.75 : 1), pan: h.pan, seed: i })));
  add("hats", hats, groove, -26, 0.05, 0);
  add("shaker", oneShots((bus) => ev.shakers.forEach((s, i) => shaker(bus, s.t, { gain: s.vel, pan: (i % 2 ? 0.3 : -0.3), seed: i }))), groove, -30, 0, 0);
  add("crash", oneShots((bus) => ev.crashes.forEach((c, i) => crash(bus, c.t, { gain: c.vel, decay: c.decay ?? 0.9, seed: i }))), [DROP, DROP + 2], -24, 0, 0, false);
  add("toms", oneShots((bus) => ev.toms.forEach((t, i) => tom(bus, t.t, { freq: t.freq, gain: t.vel, pan: t.pan, seed: i }))), [beatAt(59), beatAt(60)], -17, 0.12, 0);
  const fx = oneShots((bus) => {
    riser(bus, RISER[0], RISER[1], { midi: 57, semitones: 24, gain: 1, seed: 7 });
    ev.swells.forEach((s, i) => swell(bus, s.end, { length: s.length, gain: s.vel * 0.9, seed: i }));
    ev.downlifters.forEach((d, i) => downlifter(bus, d.t, { length: d.length, gain: d.vel * 0.5, seed: i }));
  });
  add("riser, sweeps", fx, [RISER[0], RISER[1]], -23, 0.35, 0, false);
  const impacts = new Float32Array(LENGTH);
  ev.impacts.forEach((x, i) => impact(impacts, x.t, { gain: x.vel, seed: i }));
  add("impact", monoToStereo(multiply(impacts, pumps.bass)), [DROP, DROP + 1], -24, 0.2, 0, false);

  // Bass: a mono sub that follows the roots, an octave layer and off-beat stabs for small speakers.
  const sub = subBass(LENGTH, ev.sub, { glide: 0.02, attack: 0.006, release: 0.05 });
  saturate(sub, 2.4);
  const subSt = monoToStereo(multiply(sub, pumps.bass));
  add("sub", subSt, groove, -23, 0, 0);
  spectrum("sub", subSt, groove, ["above 120 Hz", [2, 3, 4, 5, 6, 7, 8]]);
  const mid = stereo(LENGTH);
  plucks(mid, ev.bassMid, { decay: 3, release: 0.05, cutoff: 160, keytrack: 1.3, envAmount: 600, filterDecay: 0.12, q: 0.8, detune: 4, square: 0.3, seed: 11 });
  saturate(mid.l, 1.5);
  saturate(mid.r, 1.5);
  eq(mid, () => [Biquad.of("highpass", 70, 0.7), Biquad.of("peak", 300, 1, -3)]);
  applyGain(mid, pumps.bass);
  add("bass, octave", mid, groove, -23, 0, 0);
  spectrum("bass, octave", mid, groove, ["above 120 Hz", [2, 3, 4, 5, 6, 7, 8]]);
  const stabBus = stereo(LENGTH);
  plucks(stabBus, ev.stabs, { decay: 0.12, release: 0.02, cutoff: 260, keytrack: 1.5, envAmount: 1500, filterDecay: 0.04, q: 1.1, detune: 5, square: 0.4, seed: 12 });
  eq(stabBus, () => [Biquad.of("highpass", 80, 0.7), Biquad.of("peak", 320, 1, -3)]);
  applyGain(stabBus, pumps.soft);
  add("bass stabs", stabBus, [at(19), at(29)], -25, 0, 0);

  // Chords: wide supersaws pumping to the kick; the chat gets its own gated, filtered pulse.
  const pulseBus = stereo(LENGTH);
  supersaw(pulseBus, ev.pulse, { voices: 5, detune: 18, width: 0.6, attack: 0.004, release: 0.03, seed: 21 });
  const eighths = Array.from({ length: Math.round(RISER[1] / (BEAT / 2)) }, (_, i) => (i * BEAT) / 2);
  applyGain(pulseBus, multiply(gateCurve(LENGTH, eighths, { attackMs: 3, decay: 0.11, floor: 0.16, from: 0, to: RISER[1] }), dbCurve(LENGTH, [[0, -3], [at(4), 0], [RISER[1], 2.5]])));
  lowpassSweep(pulseBus, (t) => 380 * Math.pow(4600 / 380, Math.pow(Math.min(1, t / RISER[1]), 2.3)), 1.1, 2);
  eq(pulseBus, () => [Biquad.of("highpass", 220, 0.7)]);
  add("chat pulse", pulseBus, [0, at(5)], -27, 0.15, 0);

  const chordBus = stereo(LENGTH);
  supersaw(chordBus, ev.chords, { voices: 7, detune: 24, width: 0.85, attack: 0.006, release: 0.12, seed: 22 });
  const chordCutoff = (t: number) => {
    if (t < at(29)) return 9500;
    if (t < at(33)) return 5200;
    if (t < at(37)) return 12000;
    if (t < at(39, 8)) return 380 + 11620 * Math.pow(1 - smooth((t - at(37)) / BEAT / 2), 3);
    if (t < HIT) return 380 * Math.pow(7000 / 380, smooth((t - at(39, 8)) / (beatAt(159.75) - at(39, 8))));
    return 11000 * Math.pow(700 / 11000, smooth((t - HIT) / 5));
  };
  lowpassSweep(chordBus, chordCutoff, 0.8);
  eq(chordBus, () => [Biquad.of("highpass", 240, 0.7), Biquad.of("peak", 3800, 1.2, -1)]);
  applyGain(chordBus, multiply(pumps.chords, dbCurve(LENGTH, [[0, 0], [at(29) - 0.05, 0], [at(29), -5], [at(33) - 0.05, -5], [at(33), 0.5], [at(37) - 0.05, 0.5], [at(37), -4], [HIT - 0.05, -4], [HIT, 1], [HIT + 1, -2], [HIT + 6.5, -20]])));
  add("chords", chordBus, groove, -18, 0.06, 0);
  spectrum("chords", chordBus, groove, ["250 Hz-1 kHz", [3, 4]]);
  const topBus = stereo(LENGTH);
  supersaw(topBus, ev.chordsTop, { voices: 5, detune: 20, width: 1, attack: 0.006, release: 0.12, seed: 23 });
  eq(topBus, () => [Biquad.of("highpass", 500, 0.7), Biquad.of("lowpass", 9000, 0.7), Biquad.of("peak", 3800, 1.2, -2)]);
  applyGain(topBus, pumps.chords);
  add("chords, top octave", topBus, [at(33), at(37)], -25, 0.08, 0);

  // Arps
  const arpBus = stereo(LENGTH);
  plucks(arpBus, ev.arp, { decay: 0.2, release: 0.03, cutoff: 350, keytrack: 1, envAmount: 5200, filterDecay: 0.065, q: 1.25, detune: 7, square: 0, seed: 31 });
  eq(arpBus, () => [Biquad.of("highpass", 280, 0.7), Biquad.of("peak", 4500, 1.2, -1)]);
  applyGain(arpBus, pumps.arp);
  add("arp", arpBus, groove, -21.5, 0.12, 0.12);
  const arpMuted = stereo(LENGTH);
  plucks(arpMuted, ev.arpMuted, { decay: 0.18, release: 0.03, cutoff: 200, keytrack: 0.6, envAmount: 900, filterDecay: 0.05, q: 1, detune: 7, square: 0, seed: 32 });
  eq(arpMuted, () => [Biquad.of("highpass", 200, 0.7), Biquad.of("lowpass", 2200, 0.7)]);
  add("arp, muted", arpMuted, [at(2), at(5)], -30, 0.15, 0.1);

  // Melody
  const leadOptions = { glide: 0.018, attack: 0.004, decay: 0.25, sustain: 0.62, release: 0.07, cutoff: 1200, keytrack: 2.6, envAmount: 4200, filterDecay: 0.14, q: 0.85, detune: 11, pulse: 0.12, vibrato: 0.12 };
  const leadBus = monoToStereo(lead(LENGTH, ev.lead, { ...leadOptions, seed: 41 }));
  eq(leadBus, () => [Biquad.of("highpass", 480, 0.7), Biquad.of("peak", 2300, 0.8, 3.5), Biquad.of("peak", 4800, 1.4, -2.5), Biquad.of("lowpass", 9000, 0.7)]);
  applyGain(leadBus, pumps.lead);
  add("lead (hook)", leadBus, [DROP, at(10)], -16.5, 0.18, 0.28);
  spectrum("lead (hook)", leadBus, [DROP, at(10)], ["1-4 kHz", [5, 6]]);
  const lowBus = monoToStereo(lead(LENGTH, ev.leadLow, { ...leadOptions, cutoff: 600, envAmount: 2400, pulse: 0, seed: 42 }));
  eq(lowBus, () => [Biquad.of("highpass", 220, 0.7), Biquad.of("peak", 350, 1, -2)]);
  applyGain(lowBus, pumps.lead);
  add("lead, octave down", lowBus, [at(33), at(37)], -23, 0.1, 0);
  const callMono = lead(LENGTH, ev.call, { ...leadOptions, cutoff: 1200, envAmount: 4500, filterDecay: 0.09, sustain: 0.4, seed: 43 });
  const callBus = stereo(LENGTH);
  addPanned(callBus, callMono, 0, 1, -0.55);
  eq(callBus, () => [Biquad.of("highpass", 300, 0.7), Biquad.of("peak", 4700, 1.4, -3)]);
  applyGain(callBus, pumps.lead);
  add("call (left)", callBus, [at(24), at(28)], -19, 0.2, 0.3);
  const bellBus = stereo(LENGTH);
  bells(bellBus, ev.bell, { ratio: 3, index: 1.8, indexDecay: 0.25, decay: 0.9, release: 0.25, detune: 4 });
  eq(bellBus, () => [Biquad.of("highpass", 350, 0.7), Biquad.of("peak", 4700, 1.4, -2)]);
  applyGain(bellBus, pumps.soft);
  add("bell", bellBus, [at(15), at(19)], -21.5, 0.3, 0.3);
  const hookPluck = stereo(LENGTH);
  plucks(hookPluck, ev.hookPluck, { decay: 0.35, release: 0.05, cutoff: 1200, keytrack: 1.5, envAmount: 5000, filterDecay: 0.09, q: 1, detune: 9, square: 0.25, seed: 44 });
  eq(hookPluck, () => [Biquad.of("highpass", 300, 0.7), Biquad.of("peak", 4700, 1.4, -3)]);
  applyGain(hookPluck, pumps.soft);
  add("hook pluck", hookPluck, [at(29), at(33)], -22.5, 0.2, 0.25);
  const chopBus = stereo(LENGTH);
  chops(chopBus, ev.chops, 51);
  eq(chopBus, () => [Biquad.of("highpass", 200, 0.7), Biquad.of("peak", 3000, 1, 2), Biquad.of("highshelf", 8000, 0.7, 2)]);
  applyGain(chopBus, pumps.soft);
  add("vocal chops", chopBus, [at(19), at(29)], -22, 0.35, 0.3, false);

  // Pops
  const popBus = stereo(LENGTH);
  pops(popBus, ev.pops);
  eq(popBus, () => [Biquad.of("highpass", 150, 0.7)]);
  add("pops", popBus, [0, at(5)], -22.5, 0.15, 0, false);
  const calmBus = stereo(LENGTH);
  pops(calmBus, ev.calmPops);
  eq(calmBus, () => [Biquad.of("highpass", 150, 0.7)]);
  add("pops, calm", calmBus, [at(37), at(40)], -27, 0.45, 0.3, false);

  const wet = reverb(toReverb, { rt60: 1.1, predelayMs: 16, damping: 0.45, size: 0.6 });
  eq(wet, () => [Biquad.of("highpass", 320, 0.7), Biquad.of("lowpass", 8500, 0.7)]);
  applyGain(wet, pumps.returns);
  const echo = pingPong(toDelay, BEAT * 0.75, 0.34, 600, 4800);
  applyGain(echo, pumps.returns);
  const gWet = fromDb(-26 - lufsOf(wet, ...groove));
  const gEcho = fromDb(-27 - lufsOf(echo, DROP, at(10)));
  mixInto(dry, wet, gWet);
  mixInto(dry, echo, gEcho);
  console.log(`  ${"reverb return".padEnd(20)} ${toDb(gWet).toFixed(1).padStart(6)} dB\n  ${"delay return".padEnd(20)} ${toDb(gEcho).toFixed(1).padStart(6)} dB`);
  console.log(`\nStem spectra (% of energy)\n  ${"".padEnd(20)} ${BAND_LABELS.map((l) => l.padStart(6)).join(" ")}`);
  for (const line of spectra) console.log(line);
  return dry;
}

// ---------------------------------------------------------------- master

function copy(st: Stereo): Stereo {
  return { l: Float32Array.from(st.l), r: Float32Array.from(st.r) };
}

function normalize(st: Stereo, target: number): void {
  scale(st, fromDb(target - loudness(st).integrated));
}

/** Silence after the tail has died away, so the file ends on true digital zero. */
function closeTail(st: Stereo, from: number, to: number): void {
  const a = Math.round(from * SR);
  const b = Math.round(to * SR);
  for (let k = a; k < st.l.length; k++) {
    const g = k >= b ? 0 : 1 - smooth((k - a) / (b - a));
    st.l[k] *= g;
    st.r[k] *= g;
  }
}

function master(mix: Stereo): Stereo {
  eq(mix, () => [
    Biquad.of("highpass", 25, 0.7),
    Biquad.of("peak", 300, 0.9, -1.5),
    Biquad.of("lowshelf", 50, 0.7, -1.5),
    Biquad.of("highshelf", 7000, 0.7, 1.5),
  ]);
  monoBelow(mix, 120);
  normalize(mix, TARGET_LUFS - 2);
  const groove = loudness(mix).range(at(10) * SR, at(29) * SR);
  const glue = compress(mix, { thresholdDb: groove + 1, ratio: 2, kneeDb: 6, attackMs: 15, releaseMs: 120, rmsMs: 10 });
  console.log(`Glue compression: deepest ${glue.toFixed(1)} dB`);

  let ceiling = -1.3;
  let makeup = 0;
  for (let pass = 1; ; pass++) {
    const out = copy(mix);
    normalize(out, TARGET_LUFS + makeup);
    const lim = limit(out, ceiling, 3, 80);
    closeTail(out, SECONDS - 0.5, SECONDS - 0.15);
    const tp = truePeakDb(out);
    const lu = loudness(out).integrated;
    console.log(
      `Limiter pass ${pass}: ceiling ${ceiling.toFixed(2)} dBFS, deepest ${lim.deepestDb.toFixed(1)} dB, ` +
        `>1 dB ${lim.over1.toFixed(2)} % / >3 dB ${lim.over3.toFixed(2)} % of the time, ${lu.toFixed(2)} LUFS, ${tp.toFixed(2)} dBTP`,
    );
    if (pass >= 6) return out;
    if (tp > -1.1) ceiling -= tp + 1.15;
    else if (Math.abs(lu - TARGET_LUFS) > 0.1) makeup += TARGET_LUFS - lu;
    else return out;
  }
}

// ---------------------------------------------------------------- plan and files

function plan(): ScorePlan {
  const kicks = ev.kicks.map((k) => ({ beat: Math.round((k.t / BEAT) * 4) / 4, kind: k.kind }));
  const kickSet = new Set(kicks.map((k) => k.beat));
  const template = (kind: KickKind) => {
    const one = new Float32Array(Math.round(0.1 * SR));
    kick(one, 0, kickOptions(kind, 1));
    if (kind === "muffled") eqMono(one, muffle);
    return one;
  };
  const offBeats = Array.from({ length: 148 - 24 }, (_, i) => 24.5 + i);
  const quiet = [...Array.from({ length: 8 }, (_, b) => b), ...KICK_OUT, ...offBeats, ...Array.from({ length: 12 }, (_, i) => 148 + i), ...Array.from({ length: 15 }, (_, i) => 161 + i)];
  return {
    beatSeconds: BEAT,
    beatsPerBar: BEATS_PER_BAR,
    sections: SCENES.map((s) => ({ name: s.title, fromBar: s.startBar, toBar: s.endBar })),
    drop: DROP,
    finalHit: HIT,
    riser: RISER,
    pops: NOISE_MESSAGES.map((m) => ({ label: m.message, beat: m.beat })),
    calmPops: CALM_MESSAGES.map((m) => ({ label: m.message, beat: m.beat })),
    kicks,
    noKicks: quiet.filter((b) => !kickSet.has(b)),
    kickTemplates: { muffled: template("muffled"), full: template("full"), hit: template("hit") },
    hook: [
      [6, 10, "the hook on the lead (the drop)"],
      [29, 33, "the hook on bell and pluck (lighter)"],
      [33, 37, "the hook on lead, octave below and bell above, last bar lifted to E6 (the peak)"],
      [40, 42, "tag: the hook's figure resolving to D"],
    ],
    targetLufs: TARGET_LUFS,
    length: SECONDS,
  };
}

function writePreview(st: Stereo): void {
  const n = Math.round(PREVIEW_SECONDS * SR);
  const cut: Stereo = { l: st.l.slice(0, n), r: st.r.slice(0, n) };
  const fade = Math.round(0.02 * SR);
  for (let i = 0; i < fade; i++) {
    const g = 1 - smooth((i + 1) / fade);
    cut.l[n - fade + i] *= g;
    cut.r[n - fade + i] *= g;
  }
  mkdirSync(dirname(PREVIEW), { recursive: true });
  writeWav(PREVIEW, cut, rng(seedOf(16, 1)));
}

function analyzeFiles(): string[] {
  const problems: string[] = [];
  const score = readWav(join(OUT_DIR, "score.wav")).st;
  if (!ev.kicks.length) compose();
  problems.push(...analyzeScore(score, plan()));
  problems.push(...analyzePreview(readWav(PREVIEW).st, score, PREVIEW_SECONDS, 20));
  console.log("\nUI sounds");
  for (const name of ["sfx-key", "sfx-key-2", "sfx-key-3", "sfx-key-4", "sfx-click", "sfx-vote", "sfx-check", "sfx-notify"]) {
    // Each sound plays inside a 24-frame Sequence (src/audio/sfx.tsx), so it must end within 800 ms.
    problems.push(...analyzeSfx(name, readWav(join(OUT_DIR, `${name}.wav`)).st, 800));
  }
  return problems;
}

function main(): void {
  const started = performance.now();
  if (!process.argv.includes("--analyze")) {
    mkdirSync(OUT_DIR, { recursive: true });
    compose();
    const out = master(render());
    writeWav(join(OUT_DIR, "score.wav"), out, rng(seedOf(16, 1)));
    writePreview(out);
    for (const sound of renderSfx()) {
      writeWav(join(OUT_DIR, `${sound.name}.wav`), { l: sound.samples, r: sound.samples }, rng(seedOf(16, sound.samples.length)));
    }
    console.log(`Rendered in ${((performance.now() - started) / 1000).toFixed(1)} s -> ${OUT_DIR}, preview -> ${PREVIEW}`);
  }
  const problems = [...renderProblems, ...analyzeFiles()];
  console.log(problems.length ? `\nCHECKS FAILED\n  ${problems.join("\n  ")}` : "\nAll checks passed.");
  console.log(`Total ${((performance.now() - started) / 1000).toFixed(1)} s`);
  if (problems.length) process.exitCode = 1;
}

main();
