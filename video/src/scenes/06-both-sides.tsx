import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Sfx } from "../audio/sfx";
import { MEMBER_THREAD_PAGE, MEMBER_THREAD_WINDOW, memberThreadWindowAt } from "../lib/handoffs";
import { clamp01, easeInOut, easeOut, enter, mix } from "../lib/motion";
import { HEIGHT, localBeat, scene, WIDTH } from "../lib/timeline";
import { lines } from "../lines/bothSides";
import { roomQuestion, roomQuestionAnswer, roomThread, users } from "../screens/demo-data";
import { boxWithin, LiveThreadPage, measureThreadMenus, useRenderAgainWhenFontsLoad } from "../screens/mod/live-thread";
import { commentModMenu, MENU_GAP, MENU_WIDTH, menuEntryPoint, MenuPanel, OpenTrigger, threadModMenu } from "../screens/mod/mod-menu";
import { ModQueue, PendingThreadCard, QueueEmpty } from "../screens/mod/mod-queue";
import { countAt, RollingCount } from "../screens/mod/rolling-count";
import { type NotificationEntry, NotificationsPage } from "../screens/notifications/notifications-page";
import { SITE_HEADER_HEIGHT, SiteHeader } from "../screens/site-header";
import { ThreadPage } from "../screens/thread-page";
import { Cursor, type CursorPoint } from "../stage/cursor";
import { FloatingWindow } from "../stage/floating-window";
import { OnScreenLine } from "../stage/on-screen-line";
import { PERSPECTIVE, PERSPECTIVE_ORIGIN } from "../stage/projection";
import { SceneShell } from "../stage/scene-shell";

/*
 * Both sides of one question, each cropped to what changes: the moderator's queue card and menus on
 * the left, the member's bell and status pills on the right. Every moderator action lands on a beat
 * and the member's page answers on the next one; the bell then leads to the notifications page.
 */

const S = scene("bothSides");
/** Local frame of beat `k` after the cut (beats fall on 12, 27, 42, …). */
const at = (k: number) => localBeat("bothSides", S.startBeat + k);

/** The handoff from scene 5 holds until here. */
const HANDOFF_END = 24;
const QUEUE_IN = at(2);
const DUPLICATE = at(3);
const APPROVE = at(4);
/** The member's page goes public and the bell gets its first count. */
const PUBLISH = at(5);
/** The pending pill has gone and the page switches to its public state. */
const PUBLISHED = PUBLISH + 10;
const REPLY = at(6);
const COMMENT_MENU = at(7);
const BEST = at(8);
/** "Answered" on the member's page and the third count on the bell. */
const ANSWERED = at(9);
const THREAD_MENU = at(10);
const VERIFY = at(11);
const VERIFIED = at(12);
const BELL_TAP = at(13);
const NOTIFICATIONS = at(14);
/** The rows fade up on eighth notes as the page loads. */
const ROW_LANDS = [NOTIFICATIONS, NOTIFICATIONS + 8, NOTIFICATIONS + 15];

/** Key moments in local frames, for the score. */
export const BOTH_SIDES_FRAMES = {
  queueIn: QUEUE_IN,
  duplicate: DUPLICATE,
  approve: APPROVE,
  bells: [PUBLISH, REPLY, ANSWERED],
  commentMenu: COMMENT_MENU,
  best: BEST,
  threadMenu: THREAD_MENU,
  verify: VERIFY,
  verified: VERIFIED,
  bellTap: BELL_TAP,
  notifications: NOTIFICATIONS,
};

/* ---------------------------------------------------------------------------------------------- */
/* Placing windows by their corner in the frame                                                    */

type Box = { w: number; h: number };
/** A window's apparent top-left corner in frame px, its device scale, depth, depth-of-field blur and opacity. */
type Place = { left: number; top: number; s: number; z: number; blur: number; opacity: number };
type Key = Place & { f: number; ease?: (t: number) => number };

/** FloatingWindow props that put the window's projected top-left corner at (left, top). */
function windowAt(box: Box, p: Place) {
  const k = PERSPECTIVE / (PERSPECTIVE - p.z);
  return {
    width: box.w,
    height: box.h,
    scale: p.s,
    z: p.z,
    x: (p.left - PERSPECTIVE_ORIGIN.x) / k + PERSPECTIVE_ORIGIN.x - WIDTH / 2 + (box.w * p.s) / 2,
    y: (p.top - PERSPECTIVE_ORIGIN.y) / k + PERSPECTIVE_ORIGIN.y - HEIGHT / 2 + (box.h * p.s) / 2,
    blur: p.blur,
    opacity: p.opacity,
  };
}

/** Frame position of window point (px, py) for a window placed with `windowAt`. */
function pointAt(p: Place, px: number, py: number) {
  const k = PERSPECTIVE / (PERSPECTIVE - p.z);
  return { x: p.left + px * p.s * k, y: p.top + py * p.s * k };
}

const FIELDS = ["left", "top", "s", "z", "blur", "opacity"] as const;

/** The placement at `frame` along keyframes; each segment eases with its end key's curve. */
function track(frame: number, keys: Key[]): Place {
  if (frame <= keys[0].f) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.f) {
      const t = (b.ease ?? easeInOut)((frame - a.f) / (b.f - a.f));
      const out = { ...a };
      for (const key of FIELDS) out[key] = mix(a[key], b[key], t);
      return out;
    }
  }
  return keys[keys.length - 1];
}

const RECEDE = -700;
/** The queue steps back less far: it keeps the left of the frame filled while the member's page answers. */
const NEAR_RECEDE = -500;
const BACK_BLUR = 4;

/* ---------------------------------------------------------------------------------------------- */
/* The member: a phone-width window cropped to the header and the top of the thread               */

/* At 2.8 the bell's 10px count reads at 28 frame px; a phone-width page keeps the bell and the pills in one crop. */
const PHONE = 360;
const MEMBER_SCALE = 2.8;
/** Scrolled so the title sits right under the header. */
const MEMBER_SCROLL = 60;
/**
 * The crop ends under the status pills, above the action bar (its controls run wider than a phone):
 * window px to just under the byline, plus the pill row while it is open.
 */
const CROP_BYLINE = 215;
const PILL_ROW = 36;

const MEMBER_KEYS: Key[] = [
  // Waiting at the right edge while the moderator reviews.
  { f: 0, left: 1440, top: 270, s: MEMBER_SCALE, z: RECEDE, blur: BACK_BLUR, opacity: 1 },
  { f: APPROVE - 2, left: 1420, top: 266, s: MEMBER_SCALE, z: RECEDE, blur: BACK_BLUR, opacity: 1 },
  // The camera follows the approval across.
  { f: PUBLISH + 1, left: 470, top: 226, s: MEMBER_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: REPLY - 2, left: 458, top: 222, s: MEMBER_SCALE, z: 0, blur: 0, opacity: 1 },
  // Both sides in one frame for the curating.
  { f: COMMENT_MENU - 2, left: 872, top: 232, s: MEMBER_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: BELL_TAP + 6, left: 862, top: 226, s: MEMBER_SCALE, z: 0, blur: 0, opacity: 1 },
  // The notifications page takes its place and the thread steps back.
  { f: NOTIFICATIONS + 6, left: 1330, top: 300, s: MEMBER_SCALE, z: RECEDE, blur: BACK_BLUR, opacity: 1 },
  { f: S.durationInFrames, left: 1350, top: 304, s: MEMBER_SCALE, z: RECEDE, blur: BACK_BLUR, opacity: 1 },
];

/** How open the member's status pill row is: the pending pill until approval, then Answered and Verified. */
function memberPillsOpen(frame: number): number {
  if (frame < PUBLISHED) return 1 - enter(frame, PUBLISH, PUBLISHED - PUBLISH, easeOut);
  return enter(frame, ANSWERED, 14, easeOut);
}

function memberBox(frame: number): Box {
  return { w: PHONE, h: CROP_BYLINE + PILL_ROW * memberPillsOpen(frame) };
}

/* The notifications page in its own phone-width window; at 1.95 its 16px rows read at 31 frame px. */
const NOTIFICATIONS_BOX: Box = { w: PHONE, h: 600 };
const NOTIFICATIONS_SCALE = 1.95;

/** The bell's link loads the page: same header, new content, no dissolve. */
const PAGE_LOAD = BELL_TAP + 3;

/* The new page opens in the member's window, header on header, then the camera pulls back to the whole list. */
const NOTIFICATIONS_KEYS: Key[] = [
  { f: PAGE_LOAD - 1, left: 862, top: 226, s: MEMBER_SCALE, z: 0, blur: 0, opacity: 0 },
  { f: PAGE_LOAD, left: 862, top: 226, s: MEMBER_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: BELL_TAP + 6, left: 862, top: 226, s: MEMBER_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: NOTIFICATIONS + 6, left: 606, top: 168, s: NOTIFICATIONS_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: S.durationInFrames, left: 598, top: 26, s: NOTIFICATIONS_SCALE, z: 0, blur: 0, opacity: 1 },
];

/** The bell count's short pop when a notification arrives (the site's 1 → 1.3 → 1 over 320 ms). */
function popAt(frame: number, steps: number[]): number {
  return steps.reduce((acc, step) => {
    const d = frame - step;
    if (d < 0 || d > 10) return acc;
    const up = enter(d, 0, 3, easeOut);
    const down = enter(d, 3, 7, easeInOut);
    return Math.max(acc, 1 + 0.3 * up - 0.3 * down);
  }, 1);
}

const BELL_STEPS = [
  { at: PUBLISH, value: 1 },
  { at: REPLY, value: 2 },
  { at: ANSWERED, value: 3 },
];

const QUESTION = roomQuestion.title;

const notifications: NotificationEntry["n"][] = [
  { kind: "followed_best_answer", title: QUESTION, time: "just now", unread: true },
  { kind: "thread_comment", actor: users.erlangenHelper.displayName, title: QUESTION, time: "8 min. ago", unread: true },
  { kind: "thread_approved", title: QUESTION, time: "1 hr. ago", unread: true },
];

/** Measures the boxes of `selectors` inside `root` after every render, in site px. */
function useBoxes(rootRef: RefObject<HTMLElement | null>, selectors: Record<string, string>) {
  const [boxes, setBoxes] = useState<Record<string, ReturnType<typeof boxWithin>> | null>(null);
  useRenderAgainWhenFontsLoad();
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const next: Record<string, ReturnType<typeof boxWithin>> = {};
    for (const [name, selector] of Object.entries(selectors)) {
      const el = root.querySelector<HTMLElement>(selector);
      if (el) next[name] = boxWithin(el, root);
    }
    setBoxes((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  });
  return boxes;
}

const center = (b: { x: number; y: number; w: number; h: number }) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** A finger's tap on the phone: an emerald press under the finger and a ring that opens and fades. */
function Tap({ x, y, frame, at: tapAt }: { x: number; y: number; frame: number; at: number }) {
  const age = frame - tapAt;
  if (age < -3 || age > 18) return null;
  const press = enter(frame, tapAt - 3, 3, easeOut) * (1 - enter(frame, tapAt + 4, 10));
  const t = enter(frame, tapAt, 18);
  const radius = 16 + 18 * t;
  return (
    <div className="pointer-events-none absolute inset-0 z-50">
      <span
        className="absolute rounded-full"
        style={{ left: x - 18, top: y - 18, width: 36, height: 36, background: `rgb(16 185 129 / ${0.35 * press})` }}
      />
      {age >= 0 && (
        <span
          className="absolute rounded-full"
          style={{
            left: x - radius,
            top: y - radius,
            width: radius * 2,
            height: radius * 2,
            boxShadow: `0 0 0 2px rgb(52 211 153 / ${0.75 * (1 - t)})`,
          }}
        />
      )}
    </div>
  );
}

/** The member's header: the bell counts each notification as it arrives. */
function MemberHeader({ frame, hover = false }: { frame: number; hover?: boolean }) {
  return (
    <div className="member-header absolute inset-x-0 top-0 z-40">
      <SiteHeader
        device="phone"
        signedIn
        userName={users.newStudent.displayName}
        bellCount={countAt(frame, 0, BELL_STEPS, 12).value}
        bellCountNode={<RollingCount frame={frame} steps={BELL_STEPS} duration={12} line="10px" rollFromZero={false} />}
        bellPop={popAt(frame, BELL_STEPS.map((s) => s.at))}
        hover={hover ? "bell" : null}
        backgroundOpacity={0.95}
      />
    </div>
  );
}

function MemberThreadScreen({ frame }: { frame: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const boxes = useBoxes(rootRef, { bell: '.member-header [data-anchor="bell"]' });

  // Approval: the pending pill leaves as the bell counts; later Answered and Verified open the row again.
  const published = frame >= PUBLISHED;
  const motion = published
    ? {
        pillsOpen: memberPillsOpen(frame),
        pill1: enter(frame, ANSWERED, 12),
        pill2: enter(frame, VERIFIED, 12),
        published: enter(frame, PUBLISHED, 10),
        actionBar: 1,
      }
    : { pillsOpen: memberPillsOpen(frame), pill1: 1 - enter(frame, PUBLISH, 7), callout: 1, actionBar: 0 };
  const bellPoint = boxes?.bell ? center(boxes.bell) : null;

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-background">
      <div className="absolute inset-x-0 bottom-0" style={{ top: SITE_HEADER_HEIGHT }}>
        <LiveThreadPage
          thread={roomQuestion}
          viewer="author"
          device="phone"
          status={published ? "published" : "pending"}
          header={false}
          showSidebar={false}
          viewportWidth={PHONE}
          comments={frame >= REPLY ? [roomQuestionAnswer] : []}
          bestAnswerId={frame >= ANSWERED ? roomQuestionAnswer.id : null}
          verified={frame >= VERIFIED}
          scrollY={MEMBER_SCROLL}
          motion={motion}
        />
      </div>
      <MemberHeader frame={frame} hover={frame >= BELL_TAP - 4 && frame < BELL_TAP + 10} />
      {bellPoint && <Tap x={bellPoint.x} y={bellPoint.y} frame={frame} at={BELL_TAP} />}
    </div>
  );
}

/** Scroll that brings the third row fully into the window, and the frame it gets there. */
const NOTIFICATIONS_SCROLL = 165;
const NOTIFICATIONS_SETTLED = NOTIFICATIONS + 48;

function NotificationsScreen({ frame }: { frame: number }) {
  const rows = notifications.map((n, i) => ({ n, enter: enter(frame, ROW_LANDS[i] - 10, 10) }));
  const scroll = mix(0, NOTIFICATIONS_SCROLL, enter(frame, ROW_LANDS[1], NOTIFICATIONS_SETTLED - ROW_LANDS[1], easeInOut));
  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <div className="absolute inset-x-0 bottom-0" style={{ top: SITE_HEADER_HEIGHT }}>
        <NotificationsPage items={rows} narrow touch scrollY={scroll} />
      </div>
      <MemberHeader frame={frame} />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* The moderator: the queue card, then the thread's menus                                          */

/* At 2.35 the pending count's 12px badge text reads at 28 frame px. */
const QUEUE: Box = { w: 560, h: 490 };
const QUEUE_SCALE = 2.35;

const QUEUE_KEYS: Key[] = [
  { f: HANDOFF_END, left: -1500, top: 23, s: QUEUE_SCALE, z: 0, blur: 8, opacity: 0 },
  { f: QUEUE_IN, left: 64, top: 23, s: QUEUE_SCALE, z: 0, blur: 0, opacity: 1, ease: easeOut },
  { f: DUPLICATE - 2, left: 59, top: 14, s: QUEUE_SCALE, z: 0, blur: 0, opacity: 1 },
  // The camera tilts down with the card as the duplicate opens, so Approve is well inside the frame.
  { f: APPROVE - 4, left: 52, top: -128, s: QUEUE_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: APPROVE - 2, left: 50, top: -131, s: QUEUE_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: PUBLISH + 1, left: -659, top: 64, s: QUEUE_SCALE, z: NEAR_RECEDE, blur: BACK_BLUR, opacity: 1 },
  { f: REPLY - 2, left: -672, top: 66, s: QUEUE_SCALE, z: NEAR_RECEDE, blur: BACK_BLUR, opacity: 0 },
];

const PENDING_STEPS = [
  { at: QUEUE_IN, value: 1 },
  { at: APPROVE + 10, value: 0 },
];

function ModQueueScreen({ frame }: { frame: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const boxes = useBoxes(rootRef, { approve: '[data-bs-anchor="approve"]' });

  // The site hides the count at zero; here it fades in as the question lands and out after Approve.
  const badge = enter(frame, QUEUE_IN - 2, 6) * (1 - enter(frame, APPROVE + 14, 8));
  const cardIn = enter(frame, QUEUE_IN - 12, 12);
  const cardOut = enter(frame, APPROVE + 8, 12);
  const empty = 1 - enter(frame, QUEUE_IN - 12, 8) + enter(frame, APPROVE + 16, 12);
  const duplicate = enter(frame, DUPLICATE - 12, 12, easeOut);
  const highlight = enter(frame, DUPLICATE - 4, 8) * (1 - enter(frame, DUPLICATE + 24, 24));

  const approve = boxes?.approve;
  // Click Approve low on its right, so the arrow leaves the label readable.
  const a = approve ? { x: approve.x + approve.w - 10, y: approve.y + approve.h * 0.62 } : null;
  const points: CursorPoint[] = a
    ? [
        { frame: APPROVE - 26, x: a.x + 170, y: a.y + 60 },
        { frame: APPROVE, ...a, click: true },
        { frame: APPROVE + 20, x: a.x + 90, y: a.y + 30 },
      ]
    : [];

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-background">
      <ModQueue
        pendingCount={<RollingCount frame={frame} steps={PENDING_STEPS} duration={12} rollFromZero={false} />}
        pendingCountOpacity={badge}
      >
        <div className="grid [&>*]:col-start-1 [&>*]:row-start-1">
          <QueueEmpty style={{ opacity: clamp01(empty), alignSelf: "start" }} />
          <PendingThreadCard
            thread={roomQuestion}
            duplicate={roomThread}
            duplicateReveal={duplicate}
            duplicateHighlight={highlight}
            approveHover={frame >= APPROVE - 6 && frame < APPROVE + 8}
            approvePressed={frame >= APPROVE && frame < APPROVE + 4}
            approving={frame >= APPROVE + 2}
            style={{
              alignSelf: "start",
              opacity: cardIn * (1 - cardOut),
              transform: `translateY(${(1 - cardIn) * -18 - cardOut * 12}px)`,
            }}
          />
        </div>
      </ModQueue>
      {points.length > 0 && <Cursor points={points} travel={20} size={14} showAt={APPROVE - 26} hideAt={APPROVE + 22} />}
    </div>
  );
}

/* Wide enough for the moderator's action bar (vote, comments, Share, bookmark, ⋯) on one line; menu text reads at 28 px. */
const MOD_THREAD: Box = { w: 444, h: 380 };
const MOD_THREAD_SCALE = 2;

const MOD_THREAD_KEYS: Key[] = [
  { f: PUBLISH + 1, left: -297, top: 246, s: MOD_THREAD_SCALE, z: RECEDE, blur: BACK_BLUR, opacity: 0 },
  { f: REPLY - 2, left: -300, top: 246, s: MOD_THREAD_SCALE, z: RECEDE, blur: BACK_BLUR, opacity: 1 },
  { f: COMMENT_MENU - 2, left: -22, top: 196, s: MOD_THREAD_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: BELL_TAP + 6, left: -30, top: 192, s: MOD_THREAD_SCALE, z: 0, blur: 0, opacity: 1 },
  { f: NOTIFICATIONS + 6, left: -110, top: 236, s: MOD_THREAD_SCALE, z: RECEDE, blur: BACK_BLUR, opacity: 1 },
  { f: S.durationInFrames, left: -130, top: 240, s: MOD_THREAD_SCALE, z: RECEDE, blur: BACK_BLUR, opacity: 1 },
];

/** Where the moderator's ⋯ buttons sit on the page, in page px (scroll ignored). */
type MenuAnchors = { comment: { x: number; y: number; w: number; h: number }; thread: { x: number; y: number; w: number; h: number } };

/** Page scroll that puts the comment's ⋯, then the thread's ⋯, this far below the crop's top edge. */
const COMMENT_MENU_TOP = 118;
const THREAD_MENU_TOP = 52;

function ModThreadScreen({ frame }: { frame: number }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<MenuAnchors | null>(null);
  useRenderAgainWhenFontsLoad();

  const commentScroll = anchors ? anchors.comment.y - COMMENT_MENU_TOP : 0;
  const threadScroll = anchors ? anchors.thread.y - THREAD_MENU_TOP : 0;
  // Right after the best answer is pinned the page scrolls up to the thread's own menu.
  const scroll = mix(commentScroll, threadScroll, enter(frame, BEST + 3, THREAD_MENU - 3 - (BEST + 3), easeInOut));

  useLayoutEffect(() => {
    const root = rootRef.current;
    const live = root?.querySelector<HTMLElement>(".live-thread");
    if (!root || !live) return;
    const m = measureThreadMenus(live, root);
    if (!m.commentMenu || !m.threadMenu) return;
    // Layout offsets are whole pixels; rounding keeps the scroll's fractions from feeding back.
    const next = {
      comment: { ...m.commentMenu, y: Math.round(m.commentMenu.y + scroll) },
      thread: { ...m.threadMenu, y: Math.round(m.threadMenu.y + scroll) },
    };
    setAnchors((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
  });

  const delay = 2;
  const state = {
    bestAnswerId: frame >= BEST + delay ? roomQuestionAnswer.id : null,
    verified: frame >= VERIFY + delay,
    motion: {
      pillsOpen: enter(frame, BEST + delay, 16, easeOut),
      pill1: enter(frame, BEST + delay + 2, 12),
      pill2: enter(frame, VERIFY + delay, 12),
      best: enter(frame, BEST + delay, 18, easeOut),
    },
  };

  const commentOpen = enter(frame, COMMENT_MENU, 6) * (1 - enter(frame, BEST + 1, 6));
  const threadOpen = enter(frame, THREAD_MENU, 6) * (1 - enter(frame, VERIFY + 1, 6));

  let overlay = null;
  if (anchors) {
    const comment = { ...anchors.comment, y: anchors.comment.y - commentScroll };
    const thread = { ...anchors.thread, y: anchors.thread.y - threadScroll };
    const commentPanel = { left: comment.x + comment.w - MENU_WIDTH, top: comment.y + comment.h + MENU_GAP };
    const threadPanel = { left: thread.x + thread.w - MENU_WIDTH, top: thread.y + thread.h + MENU_GAP };
    const bestEntry = menuEntryPoint(commentModMenu, "Mark best answer");
    const verifyEntry = menuEntryPoint(threadModMenu, "Mark as verified");
    const best = { x: commentPanel.left + bestEntry.x, y: commentPanel.top + bestEntry.y };
    const verify = { x: threadPanel.left + verifyEntry.x, y: threadPanel.top + verifyEntry.y };
    const points: CursorPoint[] = [
      { frame: COMMENT_MENU - 22, x: comment.x - 70, y: comment.y + 150 },
      { frame: COMMENT_MENU, ...center(comment), click: true },
      { frame: BEST, ...best, click: true },
      { frame: BEST + 14, x: best.x - 40, y: best.y + 70 },
      { frame: THREAD_MENU, ...center(thread), click: true },
      { frame: VERIFY, ...verify, click: true },
      { frame: VERIFY + 18, x: verify.x + 10, y: verify.y + 50 },
    ];
    overlay = (
      <>
        {commentOpen > 0.001 && (
          <>
            <OpenTrigger kind="comment" style={{ left: comment.x, top: comment.y, opacity: commentOpen }} />
            <MenuPanel entries={commentModMenu} open={commentOpen} hover={frame >= BEST - 6 ? "Mark best answer" : null} style={commentPanel} />
          </>
        )}
        {threadOpen > 0.001 && (
          <>
            <OpenTrigger kind="thread" style={{ left: thread.x, top: thread.y, opacity: threadOpen }} />
            <MenuPanel entries={threadModMenu} open={threadOpen} hover={frame >= VERIFY - 6 ? "Mark as verified" : null} style={threadPanel} />
          </>
        )}
        <Cursor points={points} travel={16} size={16} showAt={COMMENT_MENU - 22} hideAt={VERIFY + 24} />
      </>
    );
  }

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden bg-background">
      <LiveThreadPage
        thread={roomQuestion}
        viewer="moderator"
        status="published"
        header={false}
        showSidebar={false}
        viewportWidth={MOD_THREAD.w}
        comments={[roomQuestionAnswer]}
        bestAnswerId={state.bestAnswerId}
        verified={state.verified}
        scrollY={scroll}
        motion={state.motion}
      />
      {overlay}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* The handoff window from scene 5 and the opening move                                           */

const HANDOFF: Box = { w: MEMBER_THREAD_WINDOW.width, h: MEMBER_THREAD_WINDOW.height };
/** The pending pill's left edge, mid-height, in each member window (site px from its top-left). */
const HANDOFF_PILL = { x: 88, y: 293 };
const MEMBER_PILL = { x: 16, y: 227 };
const OPEN_END = QUEUE_IN;
/** Once in the background, the desktop page dissolves into the member's phone crop. */
const DISSOLVE = OPEN_END - 4;
const DISSOLVE_END = OPEN_END + 12;

/** The handoff window keeps its pill on the member crop's pill while it recedes and dissolves into it. */
function handoffWindow(frame: number) {
  const t = enter(frame, HANDOFF_END, OPEN_END - HANDOFF_END, easeInOut);
  const target = track(Math.max(frame, OPEN_END), MEMBER_KEYS);
  const shot = memberThreadWindowAt(S.from + HANDOFF_END);
  const start = { left: 0, top: 0, s: shot.scale, z: 0, blur: 0, opacity: 1 };
  start.left = WIDTH / 2 + shot.x - (HANDOFF.w * start.s) / 2;
  start.top = HEIGHT / 2 + shot.y - (HANDOFF.h * start.s) / 2;
  const from = pointAt(start, HANDOFF_PILL.x, HANDOFF_PILL.y);
  const to = pointAt(target, MEMBER_PILL.x, MEMBER_PILL.y);
  const s = mix(start.s, target.s, t);
  const z = mix(0, target.z, t);
  const k = PERSPECTIVE / (PERSPECTIVE - z);
  const pill = { x: mix(from.x, to.x, t), y: mix(from.y, to.y, t) };
  const place: Place = {
    left: pill.x - HANDOFF_PILL.x * s * k,
    top: pill.y - HANDOFF_PILL.y * s * k,
    s,
    z,
    blur: mix(0, BACK_BLUR, t),
    opacity: 1 - enter(frame, DISSOLVE + 2, DISSOLVE_END - DISSOLVE - 2),
  };
  return windowAt(HANDOFF, place);
}

/* ---------------------------------------------------------------------------------------------- */

/** The camera never rests: a slow push and drift under every move, from the end of the handoff. */
function cameraAt(frame: number): CSSProperties {
  const t = Math.max(0, frame - HANDOFF_END) / (S.durationInFrames - HANDOFF_END);
  const ramp = enter(frame, HANDOFF_END, 18, easeInOut);
  const push = 1 + 0.025 * t * ramp;
  const dx = 10 * t * ramp;
  return { transform: `translateX(${dx}px) scale(${push})`, transformOrigin: "50% 50%" };
}

export function BothSidesScene() {
  const frame = useCurrentFrame();

  if (frame < HANDOFF_END) {
    return (
      <SceneShell id="bothSides" enter="none">
        <FloatingWindow {...memberThreadWindowAt(S.from + frame)}>
          <ThreadPage {...MEMBER_THREAD_PAGE} />
        </FloatingWindow>
      </SceneShell>
    );
  }

  const member = track(frame, MEMBER_KEYS);
  const memberWindow = windowAt(memberBox(frame), {
    ...member,
    opacity: member.opacity * enter(frame, DISSOLVE, DISSOLVE_END - DISSOLVE - 2),
  });
  const queue = track(frame, QUEUE_KEYS);
  const modThread = track(frame, MOD_THREAD_KEYS);
  const notificationsPage = track(frame, NOTIFICATIONS_KEYS);

  return (
    <SceneShell id="bothSides" enter="none">
      <AbsoluteFill style={cameraAt(frame)}>
        {modThread.opacity > 0.001 && (
          <FloatingWindow {...windowAt(MOD_THREAD, modThread)} chrome="none" rim={1 - modThread.blur / (BACK_BLUR + 1)}>
            <ModThreadScreen frame={frame} />
          </FloatingWindow>
        )}
        {/* The member's page steps back behind the moderator's queue as it slides in. */}
        {frame < DISSOLVE_END && (
          <FloatingWindow {...MEMBER_THREAD_WINDOW} {...handoffWindow(frame)}>
            <ThreadPage {...MEMBER_THREAD_PAGE} />
          </FloatingWindow>
        )}
        {queue.opacity > 0.001 && (
          <FloatingWindow {...windowAt(QUEUE, queue)} chrome="none" rim={1 - queue.blur / 8}>
            <ModQueueScreen frame={frame} />
          </FloatingWindow>
        )}
        <FloatingWindow {...memberWindow} chrome="none" rim={1 - member.blur / BACK_BLUR}>
          <MemberThreadScreen frame={frame} />
        </FloatingWindow>
        {notificationsPage.opacity > 0.001 && (
          <FloatingWindow {...windowAt(NOTIFICATIONS_BOX, notificationsPage)} chrome="none">
            <NotificationsScreen frame={frame} />
          </FloatingWindow>
        )}
      </AbsoluteFill>
      {lines.map((l) => (
        <OnScreenLine key={l.text} {...l} y={92} size={60} />
      ))}
      {[APPROVE, COMMENT_MENU, BEST, THREAD_MENU, VERIFY].map((f) => (
        <Sfx key={`click-${f}`} kind="click" at={f} volume={0.8} />
      ))}
      <Sfx kind="click" at={BELL_TAP} volume={0.6} />
      {BELL_STEPS.map((s) => (
        <Sfx key={`notify-${s.at}`} kind="notify" at={s.at} volume={0.55} />
      ))}
    </SceneShell>
  );
}
