import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { Sfx } from "../audio/sfx";
import { CLAMP, easeInOut, easeOut, enter, mix } from "../lib/motion";
import { anmeldungThread } from "../screens/demo-data";
import { DISPLAY_TITLE_LOOK, MorphTitle, ROW_TITLE_LOOK } from "../screens/search/morph-title";
import { ResultRow } from "../screens/search/quick-search";
import { ThreadPage, threadPageAnchor } from "../screens/thread-page";
import { Cursor, type CursorPoint } from "../stage/cursor";
import { FloatingWindow } from "../stage/floating-window";
import { mixPlane, type Plane, projectPoint, projectRect, scalePlaneAbout, type Vec } from "../stage/projection";
import { SceneShell } from "../stage/scene-shell";
import { cn } from "../ui/cn";
import { VoteControl } from "../ui/vote-control";
import {
  CURSOR_HIDE,
  LEAD,
  PAGE,
  PAGE_PLANE,
  PAGE_TITLE,
  RESULT_CLICK_ON_PAGE,
  ROW_ON_PAGE,
  ROW_TITLE_ON_PAGE,
  SEARCH,
} from "./search-handoff";

/**
 * Key moments of scene 4 in its local frames (local 0 is scene 3's frame 300, three frames after the
 * click; the cut is at 12 and beats fall on 12 + 15k).
 */
export const ANSWER = {
  /** The result row grows into the page; with the ease-out the page has landed by the cut (local 12). */
  morph: 24,
  cursorIn: 33,
  /** The "Verified Oct 2026" pill glints. */
  verified: 42,
  hover: 57,
  /** The upvote, on the bar line. */
  vote: 72,
  roll: 12,
  cursorOut: 96,
  /** The page scrolls to the comments and lands on the next bar line, where the best answer lights up. */
  scroll: 108,
  scrollDuration: 24,
  reveal: 132,
} as const;

const A = ANSWER;
const SCORE = anmeldungThread.score;
const HEADER = { bellCount: 0 };
const ANCHOR_OPTS = { width: PAGE.width, header: true, titleLines: 2, pills: true, signedIn: true, sidebar: true };
const voteUp = threadPageAnchor("vote-up", ANCHOR_OPTS);
const VOTE_PILL = { x: PAGE_TITLE.x, y: voteUp.y - 18 };
/** The title wraps after "address" at the page's 720px column, as on the live site. */
const TITLE_LINES: [string, string] = ["How do I register my address ", "(Anmeldung) in Erlangen or Nuremberg?"];
/** Centre of the best-answer panel in the window once the page has scrolled to the comments (measured). */
const ANSWER_PANEL: Vec = { x: 442, y: 228 };

/** The same plane moved so that window point `point` sits at frame position `target`. */
function centreOn(plane: Plane, point: Vec, target: Vec): Plane {
  const p = projectPoint({ ...plane, ...PAGE }, point.x, point.y);
  return { ...plane, x: plane.x + target.x - p.x, y: plane.y + target.y - p.y };
}

/*
 * The camera never stops: the morph eases the page to its resting scale while a slow push towards
 * the vote starts; the scroll carries the frame over to the best answer, and a last push holds on it.
 */
const REST = scalePlaneAbout(PAGE_PLANE, PAGE, PAGE_TITLE, 2.4);
const HOLD: Plane = { ...scalePlaneAbout(REST, PAGE, voteUp, 2.46), rotateX: 3.5, rotateY: 2 };
/* The answer panel is the page's full column wide: a little further back so it keeps a margin on both sides. */
const ON_ANSWER: Plane = centreOn({ ...HOLD, scale: 2.32, rotateX: 3, rotateY: 2.5 }, ANSWER_PANEL, { x: 960, y: 600 });
const END: Plane = { ...scalePlaneAbout(ON_ANSWER, PAGE, ANSWER_PANEL, 2.44), rotateX: 2.5, rotateY: 3 };

function planeAt(frame: number, morph: number): Plane {
  const push = enter(frame, 0, A.reveal, easeInOut);
  const across = enter(frame, A.scroll - 8, A.scrollDuration + 20, easeInOut);
  const hold = enter(frame, A.reveal - 4, 268 - A.reveal, easeInOut);
  const base = mixPlane(mixPlane(PAGE_PLANE, REST, morph), HOLD, push);
  return mixPlane(mixPlane(base, ON_ANSWER, across), END, hold);
}

/** Scene 3's cursor and click ripple, carried over the cut on the row that is now the page. */
const handoffCursor: CursorPoint[] = [
  { frame: SEARCH.click - SEARCH.handoff, ...RESULT_CLICK_ON_PAGE, click: true },
];

const cursorPoints: CursorPoint[] = [
  { frame: A.cursorIn + 6, x: 330, y: 430 },
  { frame: A.hover - LEAD, x: voteUp.x + 2, y: voteUp.y + 3 },
  { frame: A.vote, x: voteUp.x + 2, y: voteUp.y + 3, click: true },
  { frame: A.cursorOut, x: voteUp.x + 64, y: voteUp.y + 62 },
];

/** Odometer: changed digits roll up inside their own box, unchanged ones stay put. */
function RollingScore({ from, to, t }: { from: number; to: number; t: number }) {
  const a = String(from);
  const b = String(to).padStart(a.length, " ");
  const old = a.padStart(b.length, " ");
  return (
    <span className="inline-flex justify-center">
      {Array.from(b, (digit, i) =>
        digit === old[i] || t >= 1 ? (
          <span key={i}>{digit}</span>
        ) : (
          <span key={i} className="inline-block h-5 overflow-hidden align-top">
            <span className="flex flex-col" style={{ transform: `translateY(${-20 * t}px)` }}>
              <span className="h-5">{old[i]}</span>
              <span className="h-5">{digit}</span>
            </span>
          </span>
        ),
      )}
    </span>
  );
}

type VoteState = { voted: boolean; hover: boolean };

/**
 * The hovered or upvoted arrow is emerald on the site; the film's VoteControl keeps both colour
 * classes and the muted one wins, so the pill's arrow is coloured from here.
 */
const ACCENT_ARROW = "[&_[data-anchor=vote-up]]:text-accent";

function voteStateAt(frame: number): VoteState {
  return { voted: frame >= A.vote, hover: frame >= A.hover - LEAD && frame < A.cursorOut - 8 };
}

/** The vote pill eases between states like the site's 150 ms transition: the old look fades off the new one. */
function VoteFade({ frame, scoreNode }: { frame: number; scoreNode: ReactNode }) {
  const changes = [A.hover - LEAD, A.vote, A.cursorOut - 8];
  const last = changes.filter((c) => c <= frame && frame < c + 6).pop();
  if (last === undefined) return null;
  const prev = voteStateAt(last - 1);
  const opacity = 1 - enter(frame, last, 6, easeOut);
  return (
    <div
      className={prev.voted || prev.hover ? `absolute ${ACCENT_ARROW}` : "absolute"}
      style={{ left: VOTE_PILL.x, top: VOTE_PILL.y, opacity }}
    >
      <VoteControl
        appearance="pill"
        score={prev.voted ? SCORE + 1 : SCORE}
        scoreNode={scoreNode}
        myVote={prev.voted ? 1 : 0}
        hover={prev.hover ? "up" : null}
      />
    </div>
  );
}

/**
 * What the page vouches for lights up on the beat: the "Verified" pill glints once the page has landed,
 * and the best answer's ring brightens with an emerald glow as the scroll lands on it, then settles a
 * little above the site's resting look.
 */
function glowStyle(frame: number): CSSProperties {
  const glint = enter(frame, A.verified - LEAD, 9) * (1 - enter(frame, A.verified + 12, 36, easeInOut));
  const bloom = enter(frame, A.reveal - LEAD, 12);
  const settle = enter(frame, A.reveal + 15, 60, easeInOut);
  return {
    "--verified-glow": 0.55 * glint,
    "--best-ring": mix(0.2, mix(0.6, 0.38, settle), bloom),
    "--best-glow": bloom * mix(0.32, 0.16, settle),
  } as CSSProperties;
}

const PAGE_CLASSES = [
  // The site's sticky header frosts what scrolls under it (backdrop-blur-xl), which over this dark page
  // reads as solid; a backdrop filter does not render inside the tilted window, so it is drawn solid.
  "[&_header]:bg-background! [&_header]:shadow-[0_-8px_0_var(--background)]",
  "[&_[data-anchor=status-pills]>:last-child]:shadow-[0_0_0_1px_rgb(52_211_153/var(--verified-glow)),0_0_26px_rgb(16_185_129/var(--verified-glow))]",
  "[&_[data-anchor=best-answer]]:shadow-[0_0_72px_-10px_rgb(16_185_129/var(--best-glow)),inset_0_0_0_1px_rgb(16_185_129/var(--best-ring))]",
].join(" ");

export function AnswerScene() {
  const frame = useCurrentFrame();
  const t = enter(frame, 0, A.morph, easeOut);
  const morphing = t < 1;
  const plane = planeAt(frame, t);

  // The row's own parts leave first; the page fades in around the travelling title and lands with it on the cut.
  const rowFade = enter(frame, 0, 6, easeOut);
  const pageIn = enter(frame, 1, 10, easeOut);
  // The title's second half fades off the row's single line and comes back as the page's second line.
  const restOnFirst = interpolate(frame, [1, 4], [1, 0], CLAMP);
  const restOnSecond = enter(frame, 3, 8, easeOut);
  // The row's fill darkens to the page's background as it grows.
  const fill = Math.min(1, t / 0.55);
  // The container grows to just past the frame's edges (the rest of the window is out of shot),
  // so its whole growth reads on screen; the clip comes off once it has arrived.
  const container = {
    x: mix(ROW_ON_PAGE.x, -160, t),
    y: mix(ROW_ON_PAGE.y, -160, t),
    right: mix(PAGE.width - ROW_ON_PAGE.x - ROW_ON_PAGE.width, 380, t),
    bottom: mix(PAGE.height - ROW_ON_PAGE.y - ROW_ON_PAGE.height, 140, t),
    radius: mix(8, 14, t),
  };
  // Frame-space bounds of the growing container hide the window's rim and shadow outside it.
  const bounds = projectRect(plane, PAGE, {
    x: container.x,
    y: container.y,
    width: PAGE.width - container.x - container.right,
    height: PAGE.height - container.y - container.bottom,
  });
  const margin = 2 + 260 * t;

  const roll = enter(frame, A.vote, A.roll, easeOut);
  const scoreNode = frame >= A.vote ? <RollingScore from={SCORE} to={SCORE + 1} t={roll} /> : undefined;
  const vote = voteStateAt(frame);
  const scrollMix = enter(frame, A.scroll, A.scrollDuration, easeInOut);

  return (
    <SceneShell id="answer" enter="none">
      <AbsoluteFill
        style={
          morphing
            ? {
                clipPath: `inset(${bounds.top - margin}px ${1920 - bounds.right - margin}px ${1080 - bounds.bottom - margin}px ${bounds.left - margin}px)`,
              }
            : undefined
        }
      >
        <FloatingWindow
          width={PAGE.width}
          height={PAGE.height}
          chrome="none"
          theme="dark"
          {...plane}
          rim={t}
          contentStyle={
            morphing
              ? {
                  clipPath: `inset(${container.y}px ${container.right}px ${container.bottom}px ${container.x}px round ${container.radius}px)`,
                }
              : undefined
          }
        >
          {morphing ? (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: `color-mix(in oklab, var(--background) ${fill * 100}%, var(--surface-hover))` }}
            />
          ) : null}
          <div
            className={cn(
              "absolute inset-0",
              PAGE_CLASSES,
              (vote.voted || vote.hover) && "[&_[data-anchor=vote-pill]_[data-anchor=vote-up]]:text-accent",
              morphing && "[&_h1]:opacity-0",
            )}
            style={{ opacity: pageIn, ...glowStyle(frame) }}
          >
            <ThreadPage
              thread={anmeldungThread}
              viewer="member"
              header={HEADER}
              verified
              score={vote.voted ? SCORE + 1 : SCORE}
              scoreNode={scoreNode}
              voted={vote.voted}
              voteHover={vote.hover}
              bodyLimit={1}
              scrollAnchor="comments"
              scrollAnchorMix={scrollMix}
            />
          </div>
          {rowFade < 1 ? (
            <div className="absolute" style={{ left: ROW_ON_PAGE.x, top: ROW_ON_PAGE.y, width: ROW_ON_PAGE.width }}>
              {/* On the handoff frame the row draws its own title: a scaled glyph run renders a little
                  narrower than its layout, so only the same run lines up exactly with scene 3. */}
              <ResultRow
                query={SEARCH.query}
                selected={1 - rowFade}
                contentOpacity={1 - rowFade}
                titleOpacity={frame === 0 ? 1 : 0}
              />
            </div>
          ) : null}
          {morphing && frame > 0 ? (
            <MorphTitle
              className="text-foreground"
              lines={TITLE_LINES}
              from={ROW_TITLE_ON_PAGE}
              to={PAGE_TITLE}
              fromLook={ROW_TITLE_LOOK}
              toLook={DISPLAY_TITLE_LOOK}
              t={t}
              restOnFirst={restOnFirst}
              restOnSecond={restOnSecond}
            />
          ) : null}
          <VoteFade frame={frame} scoreNode={scoreNode} />
          {frame < 12 ? (
            <Cursor points={handoffCursor} size={17} showAt={-9} hideAt={CURSOR_HIDE - SEARCH.handoff} />
          ) : null}
          <Cursor points={cursorPoints} size={16} travel={24} showAt={A.cursorIn} hideAt={A.cursorOut} />
        </FloatingWindow>
      </AbsoluteFill>
      <Sfx kind="vote" at={A.vote} />
    </SceneShell>
  );
}
