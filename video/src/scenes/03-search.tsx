import { Search } from "lucide-react";
import type { CSSProperties } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Sfx, TypingSfx } from "../audio/sfx";
import { easeInOut, easeOut, enter, exit, keyFrame, typed, typingEnd } from "../lib/motion";
import { lines } from "../lines/search";
import { HeroStage } from "../screens/hero";
import { DIALOG, QuickSearch } from "../screens/search/quick-search";
import { Cursor, type CursorPoint } from "../stage/cursor";
import { FloatingWindow } from "../stage/floating-window";
import { OnScreenLine } from "../stage/on-screen-line";
import { SceneShell } from "../stage/scene-shell";
import { buttonClasses } from "../ui/button";
import { Kbd } from "../ui/kbd";
import { CURSOR_HIDE, dialogPlane, LEAD, RESULT_CLICK, SEARCH } from "./search-handoff";

const S = SEARCH;
const TYPE_END = typingEnd(S.query, S.typeStart);
/** The browser's caret blink: about half a second on, half a second off. */
const BLINK = 15;

/* The dialog floats in front of the hero; only the hero, the background layer, falls out of focus. */
const HERO_BLUR = 8;
const HERO_RECEDE = 0.025;
/* The site's entrance runs from 98%; the film opens from a little further back so it reads on the beat. */
const DIALOG_FROM_Z = -110;

/** Points in dialog site px; the cursor rides on the dialog's plane. */
const cursorPoints: CursorPoint[] = [
  { frame: S.cursorIn + 12, x: 560, y: 236 },
  { frame: S.hover - LEAD, ...RESULT_CLICK },
  { frame: S.click, ...RESULT_CLICK, click: true },
];

/** Solid while typing, blinking whenever the field waits. */
function caretOn(frame: number): boolean {
  if (frame >= S.typeStart && frame <= TYPE_END + BLINK) return true;
  const since = frame - (frame < S.typeStart ? S.open : TYPE_END + BLINK);
  return Math.floor(since / BLINK) % 2 === 0;
}

/** A keycap pressed on the keyboard: it dips 1px and takes the accent, like the site's pressed state. */
function keyStyle(press: number): CSSProperties | undefined {
  if (press <= 0) return undefined;
  return {
    borderColor: `color-mix(in oklab, var(--accent) ${press * 55}%, var(--border))`,
    backgroundColor: `color-mix(in oklab, var(--accent-soft) ${press * 100}%, var(--background))`,
    color: `color-mix(in oklab, var(--accent) ${press * 100}%, var(--muted))`,
    transform: `translateY(${press}px)`,
  };
}

/** A key is fully down on its `down` frame (the beat) and eases back up from `up`. */
function press(frame: number, down: number, up: number): number {
  return Math.min(enter(frame, down - 2, 2), exit(frame, up, 9));
}

/** The hero's "Search threads ⌘ K" button (as in screens/hero.tsx) with the shortcut's keycaps live. */
function SearchButton({ frame }: { frame: number }) {
  return (
    <span className={buttonClasses({ variant: "secondary", className: "min-h-11 px-5 pr-3 text-body" })}>
      <Search strokeWidth={1.75} className="text-muted" />
      Search threads
      <span className="ml-1.5 inline-flex min-w-[2.65rem]">
        <span className="inline-flex gap-0.5">
          <Kbd style={keyStyle(press(frame, S.keyCmd, S.keyK + 12))}>⌘</Kbd>
          <Kbd style={keyStyle(press(frame, S.keyK, S.keyK + 8))}>K</Kbd>
        </span>
      </span>
    </span>
  );
}

export function SearchScene() {
  const frame = useCurrentFrame();
  // The hero falls out of focus from the ⌘ press, so the half-transparent dialog never sits on a sharp page.
  const opening = S.open - LEAD;
  const dim = enter(frame, S.keyCmd, 10);
  const dof = enter(frame, S.keyCmd, 8);
  const appear = enter(frame, opening, 5);
  const rise = enter(frame, opening, S.openDuration);
  const recede = enter(frame, S.open, S.handoff - S.open, easeInOut);
  const handoff = frame >= S.handoff;
  const dissolve = exit(frame, S.handoff, 10);
  const stageOut = exit(frame, S.handoff, 23);
  // The hero leaves while the opaque dialog still covers it, so it never shows through as the dialog thins out.
  const heroOut = exit(frame, S.handoff - 12, 12);
  const plane = dialogPlane(frame);

  const query = typed(S.query, frame, S.typeStart);
  const answered = S.results - LEAD;
  const loading = query !== "" && frame < answered;

  return (
    <SceneShell id="search" enter="none" leave="none">
      {frame < S.heroHold ? (
        <HeroStage />
      ) : (
        <AbsoluteFill style={{ filter: dof > 0.01 ? `blur(${HERO_BLUR * dof}px)` : undefined, opacity: heroOut }}>
          <HeroStage searchSlot={<SearchButton frame={frame} />} push={-HERO_RECEDE * recede} />
        </AbsoluteFill>
      )}
      {/* The dialog's backdrop, as on the site: black at 40% over the page. */}
      <AbsoluteFill style={{ backgroundColor: `rgba(0,0,0,${0.4 * dim * stageOut})` }} />

      {appear > 0 ? (
        <FloatingWindow
          width={DIALOG.width}
          height={DIALOG.height}
          radius={DIALOG.radius}
          chrome="none"
          theme="dark"
          {...plane}
          z={plane.z + DIALOG_FROM_Z * (1 - rise)}
          // Behind the growing page the dialog's own frame and shadow leave with the stage.
          opacity={appear * stageOut}
          rim={dissolve}
        >
          <QuickSearch
            query={query}
            caret={caretOn(frame) && !handoff}
            loading={loading}
            resultsIn={enter(frame, answered, 12)}
            settle={enter(frame, answered, 15)}
            spin={frame * 12}
            shimmer={easeInOut(((frame - S.typeStart) / 30) % 1)}
            selected={enter(frame, S.hover - LEAD, 6, easeOut)}
            hideResult={handoff}
            chromeOpacity={dissolve}
          />
          {handoff ? null : (
            <Cursor points={cursorPoints} size={17} travel={30} showAt={S.cursorIn} hideAt={CURSOR_HIDE} />
          )}
        </FloatingWindow>
      ) : null}

      {lines.map((l) => (
        <OnScreenLine key={l.text} {...l} y={862} />
      ))}

      <Sfx kind="key" at={S.keyCmd} volume={0.7} />
      <Sfx kind="key" at={S.keyK} volume={0.8} />
      <TypingSfx text={S.query} start={S.typeStart} volume={0.8} />
      <Sfx kind="click" at={S.click} />
    </SceneShell>
  );
}

/** Key frames for aligning the score. */
export const SEARCH_MOMENTS = {
  keys: [S.keyCmd, S.keyK],
  dialogOpen: [S.open, S.open + S.openDuration],
  typing: [S.typeStart, TYPE_END],
  keyFrames: Array.from(S.query, (_, i) => keyFrame(i, S.typeStart)),
  resultVisible: S.results,
  hover: S.hover,
  click: S.click,
  handoff: S.handoff,
};
