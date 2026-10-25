import { easeInOut, enter } from "../lib/motion";
import { scene } from "../lib/timeline";
import { DIALOG, DIALOG_LAYOUT } from "../screens/search/quick-search";
import { mixPlane, type Plane, shiftOnPlane, type Vec } from "../stage/projection";

/**
 * Entrances start this many frames ahead of their beat: the film's ease-out is most of the way in
 * after two frames, so the element visibly lands on the beat itself. Clicks and key presses bottom
 * out on the beat.
 */
export const LEAD = 2;

/** Key moments of scene 3 in its local frames: the cut is at 12 and beats fall on 12 + 15k. */
export const SEARCH = {
  /** Match cut: the hero exactly as scene 2 leaves it. */
  heroHold: 24,
  keyCmd: 24,
  /** ⌘ is held, K lands on the beat and the dialog opens on it. */
  keyK: 27,
  open: 27,
  openDuration: 12,
  query: "anmledung",
  /** On the bar line; at six keys a second every third key lands on a beat (72, 87, 102). */
  typeStart: 72,
  /** The search answers on the next bar line, after a beat of skeleton rows. */
  results: 132,
  cursorIn: 240,
  hover: 282,
  /** One beat before the cut: the page starts growing three frames later, on scene 4's first frame. */
  click: 297,
  /** Scene 4's first frame: the result row starts growing into the thread page. */
  handoff: scene("answer").from - scene("search").from,
} as const;

/** The cursor fades over the cut; scene 4 carries the rest of the fade and the click ripple. */
export const CURSOR_HIDE = SEARCH.handoff;

/*
 * Framed on what changes: the field, the result and the search row fill the upper two thirds with the
 * typed query and the result at 40 px, the story line sits in the dialog's empty lower part.
 */
const DIALOG_OPEN: Plane = { x: 0, y: 166, z: 0, scale: 2.6, rotateX: 4, rotateY: -3 };
/* The push keeps the result row where it is: the dialog grows around it. */
const DIALOG_REST: Plane = { x: -6, y: 184, z: 0, scale: 2.75, rotateX: 3, rotateY: -1.5 };

/**
 * The dialog's plane in scene 3: one slow push (6%) towards the result while the tilt settles. It
 * runs past the scene's end, so the camera is still moving when the page takes over.
 */
export function dialogPlane(frame: number): Plane {
  const t = enter(frame, SEARCH.open, SEARCH.handoff + 40 - SEARCH.open, easeInOut);
  return mixPlane(DIALOG_OPEN, DIALOG_REST, t);
}

const HANDOFF_PLANE = dialogPlane(SEARCH.handoff);

/** Scene 4's thread page window (site px, no browser chrome). */
export const PAGE = { width: 1280, height: 620 } as const;

/** Page coords of the thread title's line box (the page's article column at 1280 wide, header on). */
export const PAGE_TITLE = { x: 88, y: 57 + 40 + 20 + 16 } as const;

/**
 * The page sits on the dialog's plane so that its title lands just below and left of the result's
 * title: this dialog point (site px from the dialog's top-left) is where the page title's corner goes.
 */
const TITLE_ON_DIALOG: Vec = { x: 19, y: 129 };

const dialogCentre = { x: DIALOG.width / 2, y: DIALOG.height / 2 };
const pageCentre = { x: PAGE.width / 2, y: PAGE.height / 2 };

/** In-plane offset from the dialog's centre to the page's centre. */
const PAGE_OFFSET: Vec = {
  x: TITLE_ON_DIALOG.x - dialogCentre.x - PAGE_TITLE.x + pageCentre.x,
  y: TITLE_ON_DIALOG.y - dialogCentre.y - PAGE_TITLE.y + pageCentre.y,
};

/** The page window's plane on the handoff frame. */
export const PAGE_PLANE = shiftOnPlane(HANDOFF_PLANE, PAGE_OFFSET);

/** A dialog point in page coordinates (both windows on the handoff plane). */
function dialogToPage(p: Vec): Vec {
  return { x: p.x - dialogCentre.x - PAGE_OFFSET.x + pageCentre.x, y: p.y - dialogCentre.y - PAGE_OFFSET.y + pageCentre.y };
}

const row = DIALOG_LAYOUT.resultRow;
/** The clicked result row in page coordinates. */
export const ROW_ON_PAGE = { ...dialogToPage({ x: row.x, y: row.y }), width: row.width, height: row.height };
/** The result title's line box corner in page coordinates. */
export const ROW_TITLE_ON_PAGE = dialogToPage(DIALOG_LAYOUT.resultTitle);

/** Where the cursor clicks the result (dialog site px), and the same spot on the page. */
export const RESULT_CLICK: Vec = { x: 410, y: row.y + 34 };
export const RESULT_CLICK_ON_PAGE = dialogToPage(RESULT_CLICK);
