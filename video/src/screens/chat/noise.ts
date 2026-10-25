import { easeInOut, enter } from "../../lib/motion.ts";
import { scene } from "../../lib/timeline.ts";
import type { Vec } from "../../stage/projection.ts";
import { BURIED_ID, landsAt, NOISE_ITEMS } from "./conversation.ts";
import { AREA, BUBBLE, exitFrame, LAND_LEAD, prepare } from "./layout.ts";
import { type CameraMove, cameraPoint, type PhonePose, projectScreenPoint } from "./phone.tsx";

/*
 * Scene 1 as data, shared with scene 2: the particles of the drop are born where Bilal's answer
 * went under the header, so both scenes read the same layout.
 */

export const NOISE_CHAT = prepare(NOISE_ITEMS);

const buriedAt = landsAt(NOISE_ITEMS, BURIED_ID);
/** The first message to land after the answer starts pushing it up. */
const pushStart = landsAt(NOISE_ITEMS, "m4") - LAND_LEAD;

/** Scene 1 local frame on which Bilal's answer has gone under the header. */
const BURIED_EXIT = exitFrame(NOISE_CHAT, BURIED_ID, buriedAt, scene("noise").durationInFrames);

/** How much emerald the answer has taken on as newer messages push it up. */
export function buriedTint(frame: number): number {
  return enter(frame, pushStart, BURIED_EXIT - pushStart, easeInOut);
}

export const BURIED_WIDTH = NOISE_CHAT.layouts.get(BURIED_ID)?.width ?? BUBBLE.maxText;
/** Screen x of the buried answer's centre, where its light stays under the header. */
export const BURIED_X = BUBBLE.x + BURIED_WIDTH / 2;

/** The riser: the light under the header swells until it breaks out as particles. */
export const RISER = { from: 300, to: 334 };
/** The phone recedes and fades while the particles rise. */
export const PHONE_LEAVE = { from: 330, duration: 26 };

export function buriedGlow(frame: number): number {
  return 0.3 * enter(frame, BURIED_EXIT - 6, 24) + 0.7 * enter(frame, RISER.from, RISER.to - RISER.from, easeInOut);
}

export function noisePose(frame: number): PhonePose {
  const arrive = enter(frame, -4, 16);
  const drift = enter(frame, 0, scene("noise").durationInFrames, easeInOut);
  const leave = enter(frame, PHONE_LEAVE.from, PHONE_LEAVE.duration, easeInOut);
  return {
    x: 262 - 14 * drift,
    y: 6,
    z: -110 * (1 - arrive) - 140 * leave,
    rotateX: 4,
    rotateY: -9 + 3 * drift,
    rotateZ: -3 + 1.2 * drift,
    scale: 1,
  };
}

export function phoneLook(frame: number): { opacity: number; blur: number } {
  // Already up on the first frame, so the first message lands on the film's first beat.
  const appear = enter(frame, -4, 8);
  const leave = enter(frame, PHONE_LEAVE.from, PHONE_LEAVE.duration, easeInOut);
  return { opacity: appear * (1 - leave), blur: 7 * leave + 6 * (1 - appear) };
}

/** A slow push towards the phone that never stops until the phone has gone. */
export const NOISE_CAMERA: CameraMove = { push: 0.05, from: 0, to: scene("noise").durationInFrames, origin: [63, 52] };

/** Frame position of a point along the bottom edge of the header (screen x), at `frame`. */
export function underHeader(frame: number, sx: number): Vec {
  return cameraPoint(NOISE_CAMERA, frame, projectScreenPoint(noisePose(frame), sx, AREA.top + 4));
}
