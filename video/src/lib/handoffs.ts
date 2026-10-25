import { roomQuestion } from "../screens/demo-data";
import type { ThreadPageProps } from "../screens/thread-page";
import { easeInOut, enter } from "./motion";
import { scene } from "./timeline";

/**
 * Framings shared across a cut between scenes built separately: the outgoing scene ends on
 * exactly this framing and the incoming one starts on it, so the shot continues unbroken.
 */

/** The home hero on the stage (end of scene 2, start of scene 3). Site px inside, frame px outside. */
export const HERO_STAGE = {
  /** Frame y of the hero's top edge (the pill). */
  top: 250,
  /** Site px width of the hero column. */
  width: 1200,
  scale: 1.45,
  /** Pushes zoom towards the headline (site px from the hero's top). */
  originY: 90,
};

/** Frame position of the pill's emerald dot centre in HERO_STAGE (measured from a render). */
export const HERO_DOT = { x: 724, y: 231, size: 11.6 };

/**
 * The member's own new thread, "Waiting for review" (end of scene 5, start of scene 6):
 * <FloatingWindow {...MEMBER_THREAD_WINDOW}><ThreadPage {...MEMBER_THREAD_PAGE} /></FloatingWindow>
 */
export const MEMBER_THREAD_PAGE: ThreadPageProps = {
  thread: roomQuestion,
  status: "pending",
  viewer: "author",
  header: { bellCount: 0 },
  scrollY: 0,
};

export const MEMBER_THREAD_WINDOW = {
  width: 1280,
  height: 820,
  // Framed on the article (title, pending pill, pending note) so the pill reads at 28 px on a phone.
  scale: 2.15,
  x: 413,
  y: 212,
  z: 0,
  rotateX: 0,
  rotateY: 0,
  blur: 0,
  chrome: "browser" as const,
  theme: "dark" as const,
};

/** The handoff shot keeps pushing in while it changes hands, so the picture never freezes on the cut. */
const MEMBER_PUSH = { from: scene("ask").cutOut - 35, to: scene("bothSides").cut + 12, amount: 0.03 };

/** `MEMBER_THREAD_WINDOW` at a film frame: both scenes render this on the overlap, frame for frame. */
export function memberThreadWindowAt(filmFrame: number): typeof MEMBER_THREAD_WINDOW {
  const t = enter(filmFrame, MEMBER_PUSH.from, MEMBER_PUSH.to - MEMBER_PUSH.from, easeInOut);
  return { ...MEMBER_THREAD_WINDOW, scale: MEMBER_THREAD_WINDOW.scale * (1 + MEMBER_PUSH.amount * t) };
}
