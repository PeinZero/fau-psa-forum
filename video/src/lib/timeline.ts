/**
 * The film runs on a 120 BPM grid in 4/4: a beat is 0.5 s (15 frames) and a bar 2 s, so every
 * scene cut lands on a bar line and the score phrases around the same table.
 */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 120;
export const BEAT_SECONDS = 60 / BPM;
export const BEATS_PER_BAR = 4;

export const beat = (n: number): number => Math.round(n * BEAT_SECONDS * FPS);
export const bar = (n: number): number => beat(n * BEATS_PER_BAR);
export const seconds = (s: number): number => Math.round(s * FPS);

/** Scene changes overlap by one transition that is centred on the cut. */
export const TRANSITION = 24;
export const HALF_TRANSITION = TRANSITION / 2;

export type SceneId =
  | "noise"
  | "onePlace"
  | "search"
  | "answer"
  | "ask"
  | "bothSides"
  | "startHere"
  | "everything"
  | "backToChat"
  | "endCard";

/** Bars count from 0 here; the arrangement's "bar 7" (the drop) is bar 6 below. */
type SceneSpec = { id: SceneId; title: string; startBar: number; endBar: number };

const BAR_SPECS: SceneSpec[] = [
  { id: "noise", title: "The noise", startBar: 0, endBar: 6 },
  { id: "onePlace", title: "One place", startBar: 6, endBar: 10 },
  { id: "search", title: "Search", startBar: 10, endBar: 15 },
  { id: "answer", title: "The answer", startBar: 15, endBar: 19 },
  { id: "ask", title: "Ask", startBar: 19, endBar: 24 },
  { id: "bothSides", title: "Both sides", startBar: 24, endBar: 29 },
  { id: "startHere", title: "Start here", startBar: 29, endBar: 33 },
  { id: "everything", title: "Everything else", startBar: 33, endBar: 37 },
  { id: "backToChat", title: "Back to the chat", startBar: 37, endBar: 40 },
  { id: "endCard", title: "End card", startBar: 40, endBar: 44 },
];

const SPECS = BAR_SPECS.map((s) => ({ ...s, startBeat: s.startBar * BEATS_PER_BAR, endBeat: s.endBar * BEATS_PER_BAR }));

export type Scene = SceneSpec & {
  startBeat: number;
  endBeat: number;
  /** Cut into this scene (the middle of the incoming transition). */
  cut: number;
  /** Cut out of this scene. */
  cutOut: number;
  /** First frame the scene renders: half a transition before its cut (0 for the first scene). */
  from: number;
  /** Frames the scene renders, including both transition halves. */
  durationInFrames: number;
  /** Frame inside the scene's own Sequence where its cut happens. */
  local: number;
};

export const SCENES: Scene[] = SPECS.map((spec, i) => {
  const cut = beat(spec.startBeat);
  const cutOut = beat(spec.endBeat);
  const first = i === 0;
  const last = i === SPECS.length - 1;
  const from = first ? 0 : cut - HALF_TRANSITION;
  const to = last ? cutOut : cutOut + HALF_TRANSITION;
  return { ...spec, cut, cutOut, from, durationInFrames: to - from, local: cut - from };
});

export const DURATION = beat(SPECS[SPECS.length - 1].endBeat);

export const scene = (id: SceneId): Scene => {
  const found = SCENES.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown scene ${id}`);
  return found;
};

/** Local frame, inside a scene's Sequence, of beat `n` counted from the start of the film. */
export const localBeat = (id: SceneId, n: number): number => beat(n) - scene(id).from;
/** Local frame of bar `n` (from 0) of the film. */
export const localBar = (id: SceneId, n: number): number => bar(n) - scene(id).from;
