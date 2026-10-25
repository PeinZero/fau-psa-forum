import { ArrowBigUp, MessageSquare } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { StatusPill } from "../ui/badge";
import { CategoryGlyph } from "../ui/category-glyph";
import { cn } from "../ui/cn";
import { cityLabels, type DemoThread } from "./demo-data";

/** Marks every query word inside `text`, case-insensitively, like search results do. */
export function Highlight({ text, query }: { text: string; query: string }): ReactNode {
  const words = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (words.length === 0) return text;
  const pattern = new RegExp(`(${words.sort((a, b) => b.length - a.length).join("|")})`, "gi");
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="rounded-sm bg-accent-soft text-accent">
        {part}
      </mark>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** The `<ul>` frame for rows: hairline dividers, rows bleed into the gutter. */
export function ThreadRows({
  children,
  device = "desktop",
  className,
}: {
  children: ReactNode;
  device?: "desktop" | "phone";
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-col divide-y divide-border", device === "phone" ? "-mx-3" : "-mx-4", className)}>
      {children}
    </ul>
  );
}

export type ThreadRowProps = {
  /** Demo thread (title, category, city, author, time, excerpt, counts, pills). */
  thread: DemoThread;
  /** Overrides `thread.score`; undefined keeps it, null drops the score column (lists without scores). */
  score?: number | null;
  /** Overrides `thread.commentCount`. */
  comments?: number;
  /** On a category page every row would repeat the same category. */
  hideCategory?: boolean;
  /** On a profile every row would repeat the same author. */
  hideAuthor?: boolean;
  /** Search words to mark in the title and excerpt. */
  highlight?: string;
  /** Replaces `thread.excerpt`, e.g. with a search snippet. */
  excerpt?: string;
  /** Hover look (fill steps to `surface-hover`). */
  hover?: boolean;
  /** Hides the status pills (Answered, Pinned, Outdated, Verified). */
  hidePills?: boolean;
  /** `phone`: no score column (the score moves to the meta line), three-line titles. */
  device?: "desktop" | "phone";
};

/**
 * One feed row as in src/components/thread/thread-list.tsx: score column, meta line with the comment
 * count trailing, title, two-line excerpt and status pills when any apply.
 */
export function ThreadRow({
  thread,
  score: scoreOverride,
  comments: commentsOverride,
  hideCategory = false,
  hideAuthor = false,
  highlight,
  excerpt,
  hover = false,
  hidePills = false,
  device = "desktop",
}: ThreadRowProps) {
  const phone = device === "phone";
  const score = scoreOverride === undefined ? thread.score : scoreOverride;
  const comments = commentsOverride ?? thread.commentCount;
  const teaser = excerpt ?? thread.excerpt;
  const mark = (text: string) => (highlight ? <Highlight text={text} query={highlight} /> : text);
  const pills = hidePills
    ? []
    : [
        thread.bestCommentId !== null && <StatusPill key="answered" kind="answered" />,
        thread.pinned && <StatusPill key="pinned" kind="pinned" />,
        thread.outdated && <StatusPill key="outdated" kind="outdated" />,
        thread.verifiedMonth && <StatusPill key="verified" kind="verified" verifiedMonth={thread.verifiedMonth} />,
      ].filter(Boolean);

  return (
    <li className={cn("group relative flex gap-4 rounded-lg py-4", phone ? "px-3" : "px-4", hover && "bg-surface-hover")}>
      {score !== null && !phone && <ScoreColumn score={score} />}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-3 text-meta text-muted">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {!hideCategory && (
              <>
                <span className="relative z-10 inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-sm font-medium text-foreground/85">
                  <CategoryGlyph slug={thread.category.slug} className="size-3.5" />
                  {thread.category.name}
                </span>
                <Dot />
              </>
            )}
            {thread.city && (
              <span className="flex min-w-0 shrink items-center gap-1.5">
                <span className="truncate">{cityLabels[thread.city]}</span>
                <Dot />
              </span>
            )}
            {!hideAuthor && (
              <>
                <span className="min-w-0 truncate">{thread.author.displayName}</span>
                <Dot />
              </>
            )}
            <time className="shrink-0 whitespace-nowrap">{thread.relative}</time>
          </p>
          <RowStats score={phone && score !== null ? score : undefined} comments={comments} />
        </div>
        <h3
          className={cn(
            "mt-1 text-title font-semibold text-pretty break-words text-foreground",
            phone ? "line-clamp-3" : "line-clamp-2",
          )}
        >
          {mark(thread.title)}
        </h3>
        {teaser && <p className="mt-1 line-clamp-2 text-small break-words text-muted">{mark(teaser)}</p>}
        {pills.length > 0 && <span className="mt-2.5 flex flex-wrap items-center gap-1.5">{pills}</span>}
      </div>
    </li>
  );
}

function Dot() {
  return (
    <span aria-hidden className="shrink-0 text-subtle">
      ·
    </span>
  );
}

/** Display-only score column; a new thread shows just a faint arrow, never a zero. */
function ScoreColumn({ score }: { score: number }) {
  return (
    <span className="flex w-8 shrink-0 flex-col items-center gap-0.5 pt-0.5 text-meta tabular-nums">
      <ArrowBigUp
        aria-hidden
        strokeWidth={1.5}
        className={cn("size-5", score > 0 ? "fill-accent-soft text-accent" : "text-subtle/60")}
      />
      {score !== 0 && (
        <span className={score > 0 ? "font-semibold text-foreground" : "font-medium text-muted"}>{score}</span>
      )}
    </span>
  );
}

/** Trailing counts on the meta line; zeros are left out. Phones show the score here. */
function RowStats({ score, comments }: { score?: number; comments: number }) {
  const showScore = score !== undefined && score !== 0;
  if (!showScore && comments === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-3 tabular-nums">
      {showScore && (
        <span className={cn("inline-flex items-center gap-1", score > 0 && "text-foreground")}>
          <ArrowBigUp
            aria-hidden
            strokeWidth={1.5}
            className={cn("size-4", score > 0 ? "fill-accent-soft text-accent" : "text-subtle")}
          />
          {score}
        </span>
      )}
      {comments > 0 && (
        <span className="inline-flex items-center gap-1">
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
          {comments}
        </span>
      )}
    </span>
  );
}
