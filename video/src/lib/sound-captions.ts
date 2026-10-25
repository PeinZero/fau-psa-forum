import { CALM_MESSAGES } from "./chat-beats.ts";
import { BEAT_SECONDS, bar, FPS, scene } from "./timeline.ts";

/**
 * The captions describe the sound. The story lines are already in the picture, so repeating
 * them would print every line twice for anyone who turns captions on.
 */
export type SoundCaption = { text: string; from: number; to: number };

const seconds = (frames: number) => frames / FPS;
const RISER = bar(5);
const DROP = scene("onePlace").cut;
const BREAKDOWN = scene("backToChat").cut;
const lastCalmMessage = CALM_MESSAGES[CALM_MESSAGES.length - 1].beat * BEAT_SECONDS;

export const SOUND_CAPTIONS: SoundCaption[] = [
  { text: "[upbeat electronic music]", from: 0, to: 3 },
  { text: "[message notifications]", from: 3, to: seconds(RISER) },
  { text: "[music builds]", from: seconds(RISER), to: seconds(DROP) },
  { text: "[music quietens, message notifications]", from: seconds(BREAKDOWN), to: lastCalmMessage + 1 },
];
