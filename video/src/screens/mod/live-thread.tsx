import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { continueRender, delayRender } from "remotion";

import { clamp01 } from "../../lib/motion";
import { ThreadPage, type ThreadPageProps } from "../thread-page";

/*
 * The thread page while moderation changes it in front of the viewer. The site swaps states at
 * once; the film eases each change, so the page's own parts are opened, collapsed and faded from
 * outside through CSS variables, keyed to the page's data-anchors and structure.
 */

/** Each value runs 0 → 1; anything left out renders as the page normally does. */
export type ThreadMotion = {
  /** Status pill row: 0 collapsed, 1 open (a 20px row 16px under the byline). */
  pillsOpen?: number;
  /** Opacity of the first and second status pill. */
  pill1?: number;
  pill2?: number;
  /** The author's "Waiting for review" note: 1 open, 0 collapsed. */
  callout?: number;
  /** The action bar growing from the pending page's 24px to the 36px the vote pill needs. */
  actionBar?: number;
  /** What a published thread adds: vote and comment pills, Share, the comment form. */
  published?: number;
  /** "No comments yet" under the comments heading. */
  emptyNote?: number;
  /** The first comment growing into the list. */
  reply?: number;
  /** The best-answer panel growing in above the list. */
  best?: number;
  /** The sidebar column (wide windows only). */
  sidebar?: number;
};

const css = `
.live-thread [data-anchor="status-pills"] {
  overflow: hidden;
  max-height: calc(var(--pills-open, 1) * 20px);
  margin-top: calc(var(--pills-open, 1) * 16px);
}
.live-thread [data-anchor="status-pills"] > :nth-child(1) { opacity: var(--pill1, 1); }
.live-thread [data-anchor="status-pills"] > :nth-child(2) { opacity: var(--pill2, 1); }
.live-thread article > header + div:not([data-anchor]) {
  display: grid;
  grid-template-rows: var(--callout-rows, 1fr);
  overflow: hidden;
  margin-top: calc(var(--callout, 1) * 24px);
  opacity: var(--callout, 1);
}
.live-thread article > header + div:not([data-anchor]) > * { min-height: 0; }
.live-thread [data-anchor="action-bar"] { min-height: calc(24px + var(--action-bar, 0) * 12px); }
.live-thread [data-anchor="vote-pill"],
.live-thread [data-anchor="comments-pill"],
.live-thread [data-anchor="share"],
.live-thread article section > div:last-child:not(:first-child) { opacity: var(--published, 1); }
.live-thread article section > p { opacity: var(--empty-note, 1); }
.live-thread [data-anchor="comments"] > span { opacity: var(--reply-fade, 1); }
.live-thread article section > ul { display: grid; grid-template-rows: var(--reply-rows, 1fr); }
.live-thread article section > ul > li { min-height: 0; overflow: hidden; opacity: var(--reply-fade, 1); }
.live-thread [data-anchor="best-answer"] {
  overflow: hidden;
  max-height: var(--best-h, none);
  margin-top: calc((var(--best, 1) - 1) * 16px);
  opacity: var(--best-fade, 1);
}
.live-thread [data-anchor="sidebar"] { opacity: var(--sidebar, 1); }
`;

const fade = (t: number, delay = 0.25) => clamp01((t - delay) / (1 - delay));

function motionVars(m: ThreadMotion): CSSProperties {
  const vars: Record<string, string | number> = {};
  if (m.pillsOpen !== undefined) vars["--pills-open"] = m.pillsOpen;
  if (m.pill1 !== undefined) vars["--pill1"] = m.pill1;
  if (m.pill2 !== undefined) vars["--pill2"] = m.pill2;
  if (m.callout !== undefined) {
    vars["--callout"] = m.callout;
    vars["--callout-rows"] = `minmax(0, ${m.callout}fr)`;
  }
  if (m.actionBar !== undefined) vars["--action-bar"] = m.actionBar;
  if (m.published !== undefined) vars["--published"] = m.published;
  if (m.emptyNote !== undefined) vars["--empty-note"] = m.emptyNote;
  if (m.reply !== undefined) {
    vars["--reply-rows"] = `minmax(0, ${m.reply}fr)`;
    vars["--reply-fade"] = fade(m.reply);
  }
  if (m.best !== undefined) {
    vars["--best"] = m.best;
    vars["--best-fade"] = Math.min(1, m.best * 1.6);
  }
  if (m.sidebar !== undefined) vars["--sidebar"] = m.sidebar;
  return vars as CSSProperties;
}

/**
 * Renders the calling component once more after every font face is in, so layout measured in its
 * effects matches the page the frame shows (latin-ext re-wraps German words, as the page notes).
 */
export function useRenderAgainWhenFontsLoad() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const handle = delayRender("Measuring with the fonts in");
    let done = false;
    const faces = Array.from(document.fonts, (face) => face.load());
    void Promise.allSettled(faces).then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (done) return;
          done = true;
          flushSync(() => rerender(1));
          continueRender(handle);
        }),
      ),
    );
    return () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
  }, []);
}

/** A thread page whose changes ease in. Fills its positioned parent like ThreadPage. */
export function LiveThreadPage({ motion = {}, style, ...page }: ThreadPageProps & { motion?: ThreadMotion; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [bestHeight, setBestHeight] = useState<number | null>(null);

  // The pinned panel grows to its own height, measured with the page's fonts in.
  useLayoutEffect(() => {
    const panel = ref.current?.querySelector<HTMLElement>('[data-anchor="best-answer"]');
    const height = panel ? panel.scrollHeight : null;
    setBestHeight((prev) => (prev === height ? prev : height));
  });
  useRenderAgainWhenFontsLoad();

  const vars = motionVars(motion) as Record<string, string | number>;
  if (motion.best !== undefined && bestHeight !== null && motion.best < 1) vars["--best-h"] = `${motion.best * bestHeight}px`;

  return (
    <div ref={ref} className="live-thread absolute inset-0" style={{ ...vars, ...style }}>
      <style>{css}</style>
      <ThreadPage {...page} />
    </div>
  );
}

/** Layout box of `node` inside `root` in site px (offsets ignore the windows' 3D transforms). */
export function boxWithin(node: HTMLElement, root: HTMLElement): { x: number; y: number; w: number; h: number } {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = node;
  while (current && current !== root) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return { x, y, w: node.offsetWidth, h: node.offsetHeight };
}

/** How far the page inside `live` is scrolled (ThreadPage scrolls by translating its content). */
function scrollOf(live: HTMLElement): number {
  const content = live.querySelector<HTMLElement>(":scope > div > div");
  const match = content?.style.transform.match(/translateY\((-?[\d.]+)px\)/);
  return match ? -Number(match[1]) : 0;
}

export type ThreadMenuAnchors = {
  /** The thread's ⋯ in the action bar. */
  threadMenu: { x: number; y: number; w: number; h: number } | null;
  /**
   * The ⋯ of the first comment in the list, where it sat before that comment was pinned as the best
   * answer (the pinned panel and the Answered pill push it down while its menu is still closing).
   */
  commentMenu: { x: number; y: number; w: number; h: number } | null;
};

/** Height an element adds to the flow, margin and flex `gap` included; 0 when it is not displayed. */
function flowShift(el: HTMLElement | null, gap: number): number {
  if (!el || el.offsetParent === null) return 0;
  return el.offsetHeight + (Number.parseFloat(getComputedStyle(el).marginTop) || 0) + gap;
}

/** Where the thread's and the first comment's ⋯ triggers sit on screen, in `root`'s site px. */
export function measureThreadMenus(live: HTMLElement, root: HTMLElement): ThreadMenuAnchors {
  const s = scrollOf(live);
  const find = (selector: string, lift = 0) => {
    const el = live.querySelector<HTMLElement>(selector);
    if (!el) return null;
    const box = boxWithin(el, root);
    return { ...box, y: box.y - s - lift };
  };
  const pinned =
    flowShift(live.querySelector<HTMLElement>('[data-anchor="best-answer"]'), 16) +
    flowShift(live.querySelector<HTMLElement>('[data-anchor="status-pills"]'), 0);
  return {
    threadMenu: find('[data-anchor="action-bar"] > div:last-child > div:last-child > span:last-child'),
    commentMenu: find("article section > ul > li:first-child .ml-auto > span", pinned),
  };
}
