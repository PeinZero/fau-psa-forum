import { interpolate, useCurrentFrame } from "remotion";

import { Sfx, TypingSfx } from "../audio/sfx";
import { MEMBER_THREAD_PAGE, MEMBER_THREAD_WINDOW, memberThreadWindowAt } from "../lib/handoffs";
import { CLAMP, easeInOut, easeOut, enter, keyFrame, mix, typed, typingEnd } from "../lib/motion";
import { HEIGHT as FRAME_HEIGHT, WIDTH as FRAME_WIDTH, localBeat, scene } from "../lib/timeline";
import { lines } from "../lines/ask";
import { AskPage } from "../screens/ask/ask-page";
import { roomQuestion } from "../screens/demo-data";
import { ThreadPage } from "../screens/thread-page";
import { Cursor, type CursorPoint } from "../stage/cursor";
import { FloatingWindow } from "../stage/floating-window";
import { OnScreenLine } from "../stage/on-screen-line";
import { SceneShell } from "../stage/scene-shell";

/*
 * The member asks: the title is being typed as we cut in, the similar thread surfaces when typing
 * pauses, then category, city and post land on the beat while the camera keeps travelling down the
 * form. The site's view transition hands over to the new thread, "Waiting for review", which scene 6
 * picks up on the same frame.
 */

/** Local frame of the scene's beat `n`, counted from its cut. */
const onBeat = (n: number) => localBeat("ask", scene("ask").startBeat + n);
/** Entrances run from one beat to the next. */
const ENTRANCE = onBeat(1) - onBeat(0);

const TITLE = roomQuestion.title;
/** Up to the comma the title is typed in one go; the pause after it lets the site look up matches. */
const FIRST = "Finding a room in Erlangen,";
const REST = TITLE.slice(FIRST.length);

/** Typing started before the cut: "Finding a room in Erlang" is in the field on the cut. */
const FIRST_START = -106;
/** Keys typed under the incoming transition are heard once the shot is fading up. */
const FIRST_HEARD = Array.from(FIRST).findIndex((_, i) => keyFrame(i, FIRST_START) >= 8);

const TYPING_RESUMES = onBeat(3);

export const ASK_TIMING = {
  pauseFrom: typingEnd(FIRST, FIRST_START),
  /** The suggestion box starts on this beat and is in place on the next one. */
  similarShown: onBeat(1),
  typingResumes: TYPING_RESUMES,
  typingEnd: typingEnd(REST, TYPING_RESUMES),
  /** The lookup for the full title answers: the list comes back to full strength. */
  similarRefreshed: onBeat(7),
  categoryClick: onBeat(10),
  cityClick: onBeat(13),
  postClick: onBeat(16),
  /** The redirect lands: the site's view transition from the form to the new thread. */
  pageSwap: onBeat(17),
  /** From here on the shot is exactly the shared handoff framing (the scene's last 36 frames). */
  handoff: scene("ask").durationInFrames - 36,
};

const T = ASK_TIMING;

/* The form window: the 672px column with the site's 24px page padding plus its centring. Tall
 * enough that its bottom edge never enters the frame. */
const WIDTH = 760;
const HEIGHT = 1420;
/** Meta text (13px) reads at 29 frame px, the title and the similar thread at 34. */
const SCALE = 2.25;

/** Cursor targets in site px, with the suggestion box open (measured from a full-size render). */
const TARGETS = {
  accommodation: { x: 150, y: 574 },
  erlangen: { x: 227, y: 794 },
  submit: { x: 632, y: 1211 },
};

/**
 * Camera speed down the form in frame px per frame: a slow drift while the title is typed and the
 * suggestion is read, then a steady glide that never passes 12 px a frame. Each pick lands near
 * mid-frame on its beat and the button low in the frame; the post settles the move, so the empty
 * page under the form barely enters the frame.
 */
const CAMERA_SPEED: [number, number][] = [
  [0, 2.6],
  [T.typingResumes, 2],
  [95, 2.5],
  [120, 6.5],
  [145, 11.6],
  [T.postClick, 11.6],
  [T.postClick + 6, 2.5],
  [T.handoff, 2],
];
/** Site y at the frame's centre on frame 0: the page heading at the top, the title above centre. */
const CAMERA_START = 250;

const speedAt = (f: number) =>
  interpolate(
    f,
    CAMERA_SPEED.map(([at]) => at),
    CAMERA_SPEED.map(([, v]) => v),
    { ...CLAMP, easing: easeInOut },
  );

const CAMERA_Y: number[] = [CAMERA_START];
for (let f = 1; f <= scene("ask").durationInFrames; f++) {
  CAMERA_Y.push(CAMERA_Y[f - 1] + (speedAt(f - 1) + speedAt(f)) / 2 / SCALE);
}
const cameraY = (f: number) => CAMERA_Y[Math.max(0, Math.min(CAMERA_Y.length - 1, f))];

/** A slow sideways drift and a tilt that settles while the form is filled in. */
const settleAt = (f: number) => enter(f, 0, T.postClick, easeInOut);
const windowX = (f: number) => mix(-34, 0, settleAt(f));

type Point = { x: number; y: number };

/** Site point → frame point, flat (the tilt only bends this slightly and smoothly). */
const toFrame = (f: number, p: Point): Point => ({
  x: FRAME_WIDTH / 2 + windowX(f) + (p.x - WIDTH / 2) * SCALE,
  y: FRAME_HEIGHT / 2 + (p.y - cameraY(f)) * SCALE,
});
const toSite = (f: number, q: Point): Point => ({
  x: WIDTH / 2 + (q.x - FRAME_WIDTH / 2 - windowX(f)) / SCALE,
  y: cameraY(f) + (q.y - FRAME_HEIGHT / 2) / SCALE,
});
/** How fast a point of the page moves through the frame. */
const pageVelocity = (f: number, p: Point): Point => {
  const a = toFrame(f, p);
  const b = toFrame(f + 1, p);
  return { x: b.x - a.x, y: b.y - a.y };
};

/** The pointer appears under the similar thread as the camera starts to glide. */
const CURSOR_IN = 126;
const CURSOR_FROM = { x: 900, y: 790 };
/** Frames the pointer rides with its target around each click, so press and ripple sit on it. */
const LOCK_BEFORE = 2;
const LOCK_AFTER = 3;

/**
 * The pointer glides smoothly through the frame between picks and matches the page's speed as it
 * reaches each one, so it never jerks against the moving camera.
 */
function pointerPath(): CursorPoint[] {
  const clicks = [
    { frame: T.categoryClick, at: TARGETS.accommodation },
    { frame: T.cityClick, at: TARGETS.erlangen },
    { frame: T.postClick, at: TARGETS.submit },
  ];
  const points: CursorPoint[] = [];
  let start = { frame: CURSOR_IN, at: CURSOR_FROM, velocity: { x: 0, y: 0 } };
  for (const click of clicks) {
    const end = click.frame - LOCK_BEFORE;
    const to = toFrame(end, click.at);
    const velocity = pageVelocity(end, click.at);
    const span = end - start.frame;
    for (let f = points.length === 0 ? start.frame : start.frame + 1; f < end; f++) {
      const t = (f - start.frame) / span;
      const h = [2 * t ** 3 - 3 * t ** 2 + 1, t ** 3 - 2 * t ** 2 + t, -2 * t ** 3 + 3 * t ** 2, t ** 3 - t ** 2];
      const q = {
        x: h[0] * start.at.x + h[1] * span * start.velocity.x + h[2] * to.x + h[3] * span * velocity.x,
        y: h[0] * start.at.y + h[1] * span * start.velocity.y + h[2] * to.y + h[3] * span * velocity.y,
      };
      points.push({ frame: f, ...toSite(f, q) });
    }
    for (let f = end; f <= click.frame + LOCK_AFTER; f++) {
      points.push({ frame: f, ...click.at, click: f === click.frame });
    }
    const leave = click.frame + LOCK_AFTER;
    start = { frame: leave, at: toFrame(leave, click.at), velocity: pageVelocity(leave, click.at) };
  }
  return points;
}

const cursorPoints = pointerPath();

const body = roomQuestion.body.map((block) => (block.type === "p" ? block.text : "")).join("\n\n");

/** The caret holds while keys come in and blinks at the browser's 500 ms once typing pauses. */
function caretOn(frame: number): boolean {
  const lastKey = frame >= T.typingResumes ? Math.min(frame, T.typingEnd) : Math.min(frame, T.pauseFrom);
  const idle = frame - lastKey;
  return idle < 15 || Math.floor((idle - 15) / 15) % 2 === 1;
}

/** The new page rises this far (frame px) into the shared framing: the site's 4px, at film pace. */
const LAND_RISE = 44;

export function AskScene() {
  const frame = useCurrentFrame();

  const title =
    frame >= T.typingResumes ? FIRST + typed(REST, frame, T.typingResumes) : typed(FIRST, frame, FIRST_START);

  // The suggestion box opens its space and fades up between two beats; the list dims while the
  // lookup for the longer title runs, as on the site.
  const open = enter(frame, T.similarShown, 12);
  const appear = enter(frame, T.similarShown, ENTRANCE);
  const listOpacity =
    1 - 0.4 * enter(frame, T.typingResumes, 5, easeOut) + 0.4 * enter(frame, T.similarRefreshed, 5, easeOut);

  const settle = settleAt(frame);
  const windowY = (HEIGHT / 2 - cameraY(frame)) * SCALE;

  // Submitted: the form eases back while the request runs, then the site's view transition fades it
  // out (now a background layer, so it may soften) while the new thread rises into place.
  const recede = enter(frame, T.postClick + 2, 30, easeOut);
  const leave = enter(frame, T.pageSwap, ENTRANCE, easeOut);
  const arrive = enter(frame, T.pageSwap, ENTRANCE, easeOut);
  const land = enter(frame, T.pageSwap, T.handoff - T.pageSwap, easeOut);

  const pending = frame >= T.postClick + 1;

  return (
    <SceneShell id="ask" leave="handoff">
      {leave < 1 && (
        <FloatingWindow
          width={WIDTH}
          height={HEIGHT}
          scale={SCALE}
          x={windowX(frame)}
          y={windowY}
          z={-40 * recede - 120 * leave}
          rotateX={4 - 2 * settle}
          rotateY={-5 + 2 * settle}
          blur={10 * leave}
          opacity={1 - leave}
          chrome="none"
          theme="dark"
        >
          <AskPage
            title={title}
            titleFocused={frame < T.categoryClick}
            caretVisible={caretOn(frame)}
            similar={{ open, appear, listOpacity }}
            category={frame >= T.categoryClick ? { slug: "accommodation", t: enter(frame, T.categoryClick, 6) } : null}
            categoryHover={{ slug: "accommodation", t: enter(frame, T.categoryClick - 5, 5) }}
            city={
              frame >= T.cityClick
                ? { value: "erlangen", previous: "", t: enter(frame, T.cityClick, 6) }
                : { value: "", t: 1 }
            }
            cityHover={{ value: "erlangen", t: enter(frame, T.cityClick - 5, 5) }}
            body={body}
            submit={{
              hover: frame >= T.postClick - 5,
              pressed: frame >= T.postClick && frame < T.postClick + 4,
              pending,
              spin: (frame - T.postClick) * 12,
            }}
          />
          <Cursor points={cursorPoints} travel={1} size={15} showAt={CURSOR_IN} />
        </FloatingWindow>
      )}
      {frame >= T.pageSwap && (
        <FloatingWindow
          {...memberThreadWindowAt(frame + scene("ask").from)}
          {...(frame < T.handoff ? { opacity: arrive, y: MEMBER_THREAD_WINDOW.y + (1 - land) * LAND_RISE } : {})}
        >
          <ThreadPage {...MEMBER_THREAD_PAGE} />
        </FloatingWindow>
      )}
      {lines.map((l) => (
        <OnScreenLine key={l.text} {...l} />
      ))}
      <TypingSfx text={FIRST.slice(FIRST_HEARD)} start={keyFrame(FIRST_HEARD, FIRST_START)} />
      <TypingSfx text={REST} start={T.typingResumes} />
      <Sfx kind="click" at={T.categoryClick} />
      <Sfx kind="click" at={T.cityClick} />
      <Sfx kind="click" at={T.postClick} />
    </SceneShell>
  );
}
