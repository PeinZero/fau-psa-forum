import { Loader2, MessageSquare, MessageSquareText, Search } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { mix } from "../../lib/motion";
import { cn } from "../../ui/cn";
import { Kbd } from "../../ui/kbd";
import { cityLabels, type DemoThread, starterThreads } from "../demo-data";
import { Highlight } from "../thread-row";

/*
 * The quick search (src/components/command/command-palette.tsx) at its desktop size: a 640×480
 * frame that keeps still while results, skeletons and suggestions swap inside it.
 */

export const DIALOG = { width: 640, height: 480, radius: 12 } as const;

/** Dialog-local site px (border included) of the parts the scenes point at. */
export const DIALOG_LAYOUT = {
  border: 1,
  inputHeight: 56,
  /** The first result row (under the "Threads" heading) once results are in. */
  resultRow: { x: 9, y: 93, width: 622, height: 60 },
  /** Top-left of the result title's line box inside the dialog (line height 24). */
  resultTitle: { x: 9 + 12 + 32 + 12, y: 93 + 8 },
  /** "Search" group heading: under three skeleton rows while loading, under the result after. */
  searchGroupLoadingY: 1 + 56 + 8 + 212,
  searchGroupResultsY: 1 + 56 + 8 + 92,
} as const;

export type QuickSearchState = {
  /** What is in the field so far. */
  query: string;
  /** The text caret is drawn (the scene blinks it). */
  caret: boolean;
  /** The first search is in flight: spinner in the field, skeleton rows. */
  loading: boolean;
  /** 0 → 1: the result fades in over the skeleton. */
  resultsIn: number;
  /** 0 → 1: the "Search" group glides from under the skeleton to under the result. */
  settle: number;
  /** Spinner angle in degrees (driven by the frame). */
  spin: number;
  /** Skeleton shimmer phase, 0 → 1 per sweep. */
  shimmer: number;
  /** 0 → 1: the result row under the cursor (fill, accent bar, ↵ moves to it). */
  selected: number;
  /** The result row is drawn by the next scene from here on. */
  hideResult?: boolean;
  /** Opacity of everything except the result row (the dialog dissolves around it). */
  chromeOpacity?: number;
};

const recentThreads = starterThreads.slice(0, 5);
const resultThread = starterThreads[0];

function threadMeta(thread: DemoThread): string {
  return [thread.category.name, thread.city ? cityLabels[thread.city] : null].filter(Boolean).join(" · ");
}

function GroupHeading({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="px-3 pt-1 pb-1 text-meta font-medium text-muted" style={style}>
      {children}
    </div>
  );
}

const tileClass =
  "flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted [&_svg]:size-4";

/** One option row as the palette draws it; `selected` 0 → 1 eases the site's 150 ms state change. */
export function OptionRow({
  icon,
  label,
  meta,
  comments = 0,
  query,
  selected = 0,
  enterHint = 0,
  highlight = false,
  contentOpacity = 1,
  titleOpacity = 1,
  style,
}: {
  icon: ReactNode;
  label: string;
  meta?: string;
  comments?: number;
  query?: string;
  selected?: number;
  /** Opacity of the ↵ hint (it keeps its width when hidden). */
  enterHint?: number;
  highlight?: boolean;
  /** Opacity of the tile, meta, count and hint (the morph fades them out). */
  contentOpacity?: number;
  titleOpacity?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      className="relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2"
      style={{ backgroundColor: `color-mix(in oklab, var(--surface-hover) ${selected * 100}%, transparent)`, ...style }}
    >
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-0.5 rounded-full bg-accent"
        style={{ opacity: selected * contentOpacity }}
      />
      <span
        aria-hidden
        className={tileClass}
        style={{ color: `color-mix(in oklab, var(--foreground) ${selected * 100}%, var(--muted))`, opacity: contentOpacity }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body text-foreground" style={{ opacity: titleOpacity }}>
          {highlight && query ? <Highlight text={label} query={query} /> : label}
        </span>
        {meta ? (
          <span className="block truncate text-meta text-muted" style={{ opacity: contentOpacity }}>
            {meta}
          </span>
        ) : null}
      </span>
      {comments > 0 ? (
        <span className="flex shrink-0 items-center gap-1 text-meta text-subtle tabular-nums" style={{ opacity: contentOpacity }}>
          <MessageSquare aria-hidden className="size-3.5" strokeWidth={1.75} />
          {comments}
        </span>
      ) : null}
      <Kbd aria-hidden style={{ opacity: enterHint * contentOpacity }}>
        ↵
      </Kbd>
    </div>
  );
}

/** The result row exactly as the dialog draws it, for the scene that morphs it into the page. */
export function ResultRow({
  selected = 1,
  query,
  contentOpacity = 1,
  titleOpacity = 1,
  style,
}: {
  selected?: number;
  query: string;
  contentOpacity?: number;
  titleOpacity?: number;
  style?: CSSProperties;
}) {
  return (
    <OptionRow
      icon={<MessageSquareText aria-hidden strokeWidth={1.75} />}
      label={resultThread.title}
      meta={threadMeta(resultThread)}
      comments={resultThread.commentCount}
      query={query}
      highlight
      selected={selected}
      enterHint={selected}
      contentOpacity={contentOpacity}
      titleOpacity={titleOpacity}
      style={style}
    />
  );
}

function SkeletonBar({ className, shimmer }: { className: string; shimmer: number }) {
  // The site's shimmer: a soft highlight sweeping right to left over the surface-hover fill.
  return (
    <div
      aria-hidden
      className={cn("rounded-md", className)}
      style={{
        backgroundColor: "var(--surface-hover)",
        backgroundImage: "linear-gradient(90deg, transparent 0%, var(--shimmer) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        backgroundPosition: `${100 - shimmer * 200}% 0`,
      }}
    />
  );
}

function SkeletonRows({ shimmer, opacity }: { shimmer: number; opacity: number }) {
  const widths = ["w-4/5", "w-3/5", "w-2/3"];
  return (
    <div aria-hidden className="pb-1" style={{ opacity }}>
      <GroupHeading>Threads</GroupHeading>
      {widths.map((width) => (
        <div key={width} className="flex items-center gap-3 px-3 py-2">
          <SkeletonBar className="size-8" shimmer={shimmer} />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-6 items-center">
              <SkeletonBar className={cn("h-3.5", width)} shimmer={shimmer} />
            </div>
            <div className="flex h-5 items-center">
              <SkeletonBar className="h-3 w-32" shimmer={shimmer} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Footer({ open, typed }: { open: number; typed: boolean }) {
  // Enter's label follows the selection: "All results" while the query is focused, "Open" on a row.
  const label = typed && open < 0.5 ? "All results" : "Open";
  const labelOpacity = typed ? Math.abs(open - 0.5) * 2 : 1;
  const combo = typed ? Math.max(0, open * 2 - 1) : 0;
  return (
    <div aria-hidden className="flex h-10 shrink-0 items-center gap-4 border-t border-border px-4 text-meta text-muted">
      <span className="flex items-center gap-1.5">
        <span className="flex gap-0.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
        </span>
        Navigate
      </span>
      <span className="flex items-center gap-1.5">
        <Kbd>↵</Kbd>
        <span style={{ opacity: labelOpacity }}>{label}</span>
      </span>
      {combo > 0 ? (
        <span className="flex items-center gap-1.5" style={{ opacity: combo }}>
          <span className="flex gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </span>
          All results
        </span>
      ) : null}
      <span className="ml-auto flex items-center gap-1.5">
        <Kbd>Esc</Kbd>
        Close
      </span>
    </div>
  );
}

/** A 1px-wide caret at the site's text size; `caret` is the blink state. */
function Caret({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block w-px bg-foreground align-middle"
      style={{ height: 18, marginLeft: 0.5, marginTop: -2, opacity: on ? 1 : 0 }}
    />
  );
}

/**
 * The palette's inside: input row, the lists for the current state and the footer. It fills a
 * 640×480 window whose own shell (radius, shadow, rim light) the film's FloatingWindow draws.
 */
export function QuickSearch({
  query,
  caret,
  loading,
  resultsIn,
  settle,
  spin,
  shimmer,
  selected,
  hideResult = false,
  chromeOpacity = 1,
}: QuickSearchState) {
  const trimmed = query.trim();
  const typed = trimmed !== "";
  const searchY = mix(DIALOG_LAYOUT.searchGroupLoadingY, DIALOG_LAYOUT.searchGroupResultsY, settle);
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden rounded-xl border border-border bg-background text-foreground">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4" style={{ opacity: chromeOpacity }}>
        {loading && typed ? (
          <Loader2 aria-hidden className="size-4 shrink-0 text-subtle" strokeWidth={1.75} style={{ transform: `rotate(${spin}deg)` }} />
        ) : (
          <Search aria-hidden className="size-4 shrink-0 text-subtle" strokeWidth={1.75} />
        )}
        <div className="flex h-full min-w-0 flex-1 items-center text-body whitespace-pre">
          {typed ? <span className="text-foreground">{query}</span> : null}
          <Caret on={caret} />
          {typed ? null : <span className="text-subtle">Search threads…</span>}
        </div>
        <Kbd aria-hidden>Esc</Kbd>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden p-2">
        {!typed ? (
          <div style={{ opacity: chromeOpacity }}>
            <div className="pb-1">
              <GroupHeading>Recent threads</GroupHeading>
              {recentThreads.map((thread) => (
                <OptionRow
                  key={thread.slug}
                  icon={<MessageSquareText aria-hidden strokeWidth={1.75} />}
                  label={thread.title}
                  meta={threadMeta(thread)}
                  comments={thread.commentCount}
                />
              ))}
            </div>
            <div className="pb-1">
              <GroupHeading>Quick actions</GroupHeading>
              <div className="h-11" />
            </div>
          </div>
        ) : (
          <>
            {resultsIn < 1 ? (
              <div className="absolute inset-x-2 top-2" style={{ opacity: chromeOpacity }}>
                <SkeletonRows shimmer={shimmer} opacity={1 - resultsIn} />
              </div>
            ) : null}
            {resultsIn > 0 ? (
              <div className="absolute inset-x-2 top-2 pb-1" style={{ opacity: resultsIn }}>
                <GroupHeading style={{ opacity: chromeOpacity }}>Threads</GroupHeading>
                <ResultRow
                  query={query}
                  selected={selected}
                  style={{
                    opacity: hideResult ? 0 : 1,
                    transform: resultsIn < 1 ? `translateY(${(1 - resultsIn) * 4}px)` : undefined,
                  }}
                />
              </div>
            ) : null}
            <div
              className="absolute inset-x-2 pb-1"
              style={{ top: searchY - DIALOG_LAYOUT.border - DIALOG_LAYOUT.inputHeight, opacity: chromeOpacity }}
            >
              <GroupHeading>Search</GroupHeading>
              <OptionRow
                icon={<Search aria-hidden strokeWidth={1.75} />}
                label={`Search all results for “${trimmed}”`}
                enterHint={1 - selected}
              />
            </div>
          </>
        )}
      </div>

      <div style={{ opacity: chromeOpacity }}>
        <Footer open={selected} typed={typed} />
      </div>
    </div>
  );
}
