import { type RefObject, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { continueRender, delayRender } from "remotion";

/*
 * A rendered page scrolls by translating its content, not by native scrolling: a native scroll
 * position does not survive reliably into Remotion's screenshots. Sticky parts (the header, the
 * sidebar group) are positioned from offsets measured here.
 */

export type PageLayout = {
  /** Offset of the first element carrying each `data-anchor`, in content px. */
  anchors: Record<string, number>;
  contentHeight: number;
  viewportHeight: number;
  /** The sticky sidebar group: its place in the flow, its height and where its column ends. */
  sticky: { top: number; height: number; limit: number } | null;
};

/** Layout offset of `node` inside `container` (unaffected by transforms such as the window's tilt). */
export function offsetWithin(node: HTMLElement, container: HTMLElement): number {
  let top = 0;
  let current: HTMLElement | null = node;
  while (current && current !== container) {
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return top;
}

function measure(root: HTMLElement, content: HTMLElement): PageLayout {
  const anchors: Record<string, number> = {};
  content.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
    const name = el.dataset.anchor;
    if (name && !(name in anchors)) anchors[name] = offsetWithin(el, content);
  });
  const group = content.querySelector<HTMLElement>('[data-anchor="sidebar-sticky"]');
  const column = content.querySelector<HTMLElement>('[data-anchor="sidebar"]');
  const sticky =
    group && column
      ? {
          top: offsetWithin(group, content),
          height: group.offsetHeight,
          limit: offsetWithin(column, content) + column.offsetHeight,
        }
      : null;
  return { anchors, contentHeight: content.offsetHeight, viewportHeight: root.clientHeight, sticky };
}

function same(a: PageLayout | null, b: PageLayout): boolean {
  return a !== null && JSON.stringify(a) === JSON.stringify(b);
}

/** Measures the page after every render and once more when the web fonts are in. */
export function usePageLayout(rootRef: RefObject<HTMLElement | null>, contentRef: RefObject<HTMLElement | null>) {
  const [layout, setLayout] = useState<PageLayout | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const content = contentRef.current;
    if (!root || !content) return;
    const next = measure(root, content);
    setLayout((prev) => (same(prev, next) ? prev : next));
  });

  useLayoutEffect(() => {
    const content = contentRef.current;
    let done = false;
    const handle = delayRender("Measuring the page");
    const remeasure = (sync: boolean) => {
      const root = rootRef.current;
      if (!root || !content) return;
      const next = measure(root, content);
      const update = () => setLayout((prev) => (same(prev, next) ? prev : next));
      if (sync) flushSync(update);
      else update();
    };
    // A font swap re-wraps text after the first measure; follow every size change of the page.
    const observer = new ResizeObserver(() => remeasure(false));
    if (content) observer.observe(content);
    // Hold the frame until every face is in (German text such as "Bürgeramt" wraps differently
    // once the latin-ext subset arrives) and the browser has laid the page out with it.
    const faces = Array.from(document.fonts, (face) => face.load());
    void Promise.allSettled(faces).then(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (done) return;
          done = true;
          remeasure(true);
          continueRender(handle);
        }),
      ),
    );
    return () => {
      observer.disconnect();
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
  }, [rootRef, contentRef]);

  return layout;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The page's scroll for this frame: `scrollY`, or eased towards an anchor by `mix` (0 → 1), kept
 * inside the page. `topInset` is what covers the top of the viewport (the sticky header) plus margin.
 */
export function resolveScroll({
  layout,
  scrollY,
  anchor,
  mix = 0,
  topInset = 0,
}: {
  layout: PageLayout | null;
  scrollY: number;
  anchor?: string;
  mix?: number;
  topInset?: number;
}): number {
  const max = layout ? Math.max(0, layout.contentHeight - layout.viewportHeight) : Number.POSITIVE_INFINITY;
  let target = scrollY;
  const anchorTop = anchor ? layout?.anchors[anchor] : undefined;
  if (anchorTop !== undefined && mix > 0) {
    const to = clamp(anchorTop - topInset, 0, max);
    target = scrollY + (to - scrollY) * mix;
  }
  return clamp(target, 0, max);
}

/** How far the sticky sidebar group has slid down at scroll `s` (sticky at `top` px under the viewport top). */
export function stickyShift(layout: PageLayout | null, s: number, top = 80): number {
  const sticky = layout?.sticky;
  if (!sticky) return 0;
  return clamp(s + top - sticky.top, 0, Math.max(0, sticky.limit - sticky.top - sticky.height));
}
