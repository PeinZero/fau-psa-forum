import { ArrowBigUp, CircleCheck, Inbox, MessageSquare, PenLine, Pin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { announcementExcerpt } from "@/components/announcements/excerpt";
import { profileHref, profileLinkClasses } from "@/components/author";
import { Highlight } from "@/components/command/highlight";
import type { BrowsePeriod, BrowseSort, BrowseCity } from "@/components/browse/params";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { VerifiedBadge } from "@/components/update-requests/verified";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cityLabels, countLabel, formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { relativeTime } from "@/lib/time";

import { CategoryGlyph } from "./category-icon";

const listSelect = `
  id, slug, title, body, city, is_outdated, is_pinned, status, created_at, last_activity_at, last_verified_at,
  score, comment_count, best_comment_id,
  category:categories!threads_category_id_fkey(slug, name),
  author:profiles!threads_author_id_fkey(display_name, username, affiliation, role)
`;

/** Long enough for two lines at the widest feed column. */
const EXCERPT_LENGTH = 220;

export async function fetchThreadsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("threads").select(listSelect).in("id", ids);
  // Bodies are trimmed here so only the teaser reaches the page.
  const rows = (data ?? []).map(({ body, ...row }) => ({ ...row, excerpt: announcementExcerpt(body, EXCERPT_LENGTH) }));
  return ids.flatMap((id) => rows.filter((row) => row.id === id));
}

export type BrowseFilters = {
  period?: BrowsePeriod;
  categoryId?: number;
  city?: BrowseCity;
  q?: string;
};

function filterArgs({ period, categoryId, city, q }: BrowseFilters) {
  return { p_period: period, p_category_id: categoryId, p_city: city, p_q: q || undefined };
}

/**
 * One page of published threads in the database's ranking. The ranked ids come first and the
 * rows are loaded by id, because embedding relations on the ranked set would not keep its order.
 */
export async function fetchBrowseThreads(
  options: BrowseFilters & { sort: BrowseSort; page?: number; limit?: number },
) {
  const limit = options.limit ?? PAGE_SIZE;
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("browse_threads", {
      ...filterArgs(options),
      p_sort: options.sort,
      p_limit: limit,
      p_offset: ((options.page ?? 1) - 1) * limit,
    })
    .select("id");
  return fetchThreadsByIds((data ?? []).map((row) => row.id));
}

export async function fetchBrowseCount(filters: BrowseFilters): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("browse_threads_count", filterArgs(filters));
  return Number(data ?? 0);
}

export type ThreadListRow = Awaited<ReturnType<typeof fetchThreadsByIds>>[number];

export type ThreadListProps = {
  threads: ThreadListRow[];
  emptyText: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  /** On a category page every row would repeat the same category. */
  hideCategory?: boolean;
};

const askAction = (
  <Link href="/new" className={buttonClasses({ variant: "secondary", size: "sm" })}>
    <PenLine strokeWidth={1.75} />
    Ask a question
  </Link>
);

export function ThreadList({
  threads,
  emptyText,
  emptyDescription,
  emptyAction = askAction,
  hideCategory = false,
}: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <EmptyState icon={<Inbox />} title={emptyText} action={emptyAction}>
        {emptyDescription ?? "Can't find what you need? Ask the community, a moderator reviews every new thread."}
      </EmptyState>
    );
  }

  return (
    <ThreadRows>
      {threads.map((thread, i) => (
        <ThreadRow key={thread.id} thread={thread} index={i} hideCategory={hideCategory} />
      ))}
    </ThreadRows>
  );
}

/** Server components render once per request, so reading the clock here cannot drift between renders. */
function sinceNow(iso: string): string {
  return relativeTime(iso, Date.now());
}

// Rows bleed into the gutter so their hover fill lines up with the text above and below the list.
const listFrame = "-mx-3 flex flex-col divide-y divide-border sm:-mx-4";
const rowFrame = "flex gap-4 rounded-lg px-3 py-4 sm:px-4";
// Links inside the row sit above the title's stretched link, so both stay clickable.
// The meta line clips overflow, so their focus ring is drawn inside.
const metaLink = "relative z-10 rounded-sm transition-colors duration-150 ease-out focus-visible:-outline-offset-2";

/** The `<ul>` frame for `ThreadRow`s, for lists that render their own rows (e.g. search results). */
export function ThreadRows({ children }: { children: ReactNode }) {
  return <ul className={listFrame}>{children}</ul>;
}

/** What a row needs; lists that load less than `ThreadListRow` leave the optional parts out. */
export type ThreadRowData = Pick<
  ThreadListRow,
  "id" | "slug" | "title" | "city" | "created_at" | "comment_count" | "best_comment_id" | "category"
> &
  Partial<Pick<ThreadListRow, "excerpt" | "score" | "is_pinned" | "is_outdated" | "last_verified_at">> & {
    author: { display_name: string; username?: string | null } | null;
  };

export type ThreadRowProps = {
  thread: ThreadRowData;
  /** Position in the list, for the staggered entrance. */
  index?: number;
  hideCategory?: boolean;
  /** Search words to mark in the title and excerpt. */
  highlight?: string;
  /** Replaces `thread.excerpt`, e.g. with a search snippet around the match. */
  excerpt?: string;
};

/**
 * One feed row: score column (display only, without a score the column is left out), meta line
 * with the comment count trailing, title, two-line excerpt and status pills when any apply.
 */
export function ThreadRow({ thread, index = 0, hideCategory = false, highlight, excerpt }: ThreadRowProps) {
  const author = thread.author?.display_name ?? "Deleted user";
  const username = thread.author?.username;
  const teaser = excerpt ?? thread.excerpt;
  const mark = (text: string) => (highlight ? <Highlight text={text} query={highlight} /> : text);
  return (
    <li
      className={cn(
        rowFrame,
        "animate-fade-up group relative transition-colors duration-150 ease-out hover:bg-surface-hover",
        "has-[.row-link:focus-visible]:outline-2 has-[.row-link:focus-visible]:-outline-offset-2 has-[.row-link:focus-visible]:outline-ring",
      )}
      style={stagger(index)}
    >
      {thread.score !== undefined && <ScoreColumn score={thread.score} />}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-3 text-meta text-muted">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
            {thread.category && !hideCategory && (
              <>
                <Link
                  href={`/c/${thread.category.slug}`}
                  className={cn(metaLink, "inline-flex min-w-0 shrink-0 items-center gap-1.5 font-medium text-foreground/85 hover:text-accent")}
                >
                  <CategoryGlyph slug={thread.category.slug} className="size-3.5" />
                  {thread.category.name}
                </Link>
                <Dot />
              </>
            )}
            {thread.city && (
              // The narrowest phones keep category, author and time; the city is on the thread page.
              <span className="flex min-w-0 shrink items-center gap-1.5 max-[399px]:hidden">
                <span className="truncate" title={cityLabels[thread.city]}>
                  {cityLabels[thread.city]}
                </span>
                <Dot />
              </span>
            )}
            {username ? (
              <Link
                href={profileHref(username)}
                title={author}
                className={cn(metaLink, profileLinkClasses, "min-w-0 truncate")}
              >
                {author}
              </Link>
            ) : (
              <span className="min-w-0 truncate" title={author}>
                {author}
              </span>
            )}
            <Dot />
            <time
              dateTime={thread.created_at}
              title={formatDate(thread.created_at)}
              className="shrink-0 whitespace-nowrap"
            >
              {sinceNow(thread.created_at)}
            </time>
          </p>
          <RowStats score={thread.score} comments={thread.comment_count} />
        </div>
        <h3 className="mt-1 line-clamp-3 text-title font-semibold text-pretty break-words text-foreground sm:line-clamp-2">
          <Link
            href={`/t/${thread.slug}`}
            className="row-link rounded-sm after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            {mark(thread.title)}
          </Link>
        </h3>
        {teaser && <p className="mt-1 line-clamp-2 text-small break-words text-muted">{mark(teaser)}</p>}
        <StatusPills thread={thread} />
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

/**
 * Desktop score column, display only (voting happens on the thread page). A new thread shows just
 * a faint arrow, so a page of fresh threads isn't a column of zeros.
 */
function ScoreColumn({ score }: { score: number }) {
  return (
    <span className="flex w-8 shrink-0 flex-col items-center gap-0.5 pt-0.5 text-meta tabular-nums max-sm:hidden">
      <ArrowBigUp
        aria-hidden
        strokeWidth={1.5}
        className={cn("size-5", score > 0 ? "fill-accent-soft text-accent" : "text-subtle/60")}
      />
      <span className={cn(score === 0 && "sr-only", score > 0 ? "font-semibold text-foreground" : "font-medium text-muted")}>
        <span className="sr-only">Score </span>
        {score}
      </span>
    </span>
  );
}

/** Trailing counts on the meta line; zeros are left out. Phones show the score here instead of the column. */
function RowStats({ score, comments }: { score?: number; comments: number }) {
  const showScore = score !== undefined && score !== 0;
  if (!showScore && comments === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-3 tabular-nums">
      {showScore && (
        <span className={cn("inline-flex items-center gap-1 sm:hidden", score > 0 && "text-foreground")}>
          <ArrowBigUp
            aria-hidden
            strokeWidth={1.5}
            className={cn("size-4", score > 0 ? "fill-accent-soft text-accent" : "text-subtle")}
          />
          {score}
          <span className="sr-only">{Math.abs(score) === 1 ? " point" : " points"}</span>
        </span>
      )}
      {comments > 0 && (
        <span className="inline-flex items-center gap-1" title={countLabel(comments, "comment")}>
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
          {comments}
          <span className="sr-only">{comments === 1 ? " comment" : " comments"}</span>
        </span>
      )}
    </span>
  );
}

function StatusPills({ thread }: { thread: ThreadRowData }) {
  return (
    <span className="mt-2.5 flex flex-wrap items-center gap-1.5 empty:hidden">
      {thread.best_comment_id !== null && (
        <Badge variant="accent">
          <CircleCheck aria-hidden strokeWidth={1.75} />
          Answered
        </Badge>
      )}
      {thread.is_pinned && (
        <Badge variant="accent">
          <Pin aria-hidden strokeWidth={1.75} />
          Pinned
        </Badge>
      )}
      {thread.is_outdated && <Badge variant="warning">Outdated</Badge>}
      {thread.last_verified_at && <VerifiedBadge at={thread.last_verified_at} />}
    </span>
  );
}

export function ThreadListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading threads…</span>
      <div className={listFrame}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className={rowFrame}>
            <div className="flex w-8 shrink-0 justify-center pt-0.5 max-sm:hidden">
              <Skeleton className="size-5 rounded-md" />
            </div>
            <div className="min-w-0 flex-1">
              <Skeleton className="my-1 h-3 w-48 max-w-full" />
              <Skeleton className={cn("mt-2.5 h-[1.125rem]", i % 2 ? "w-2/3" : "w-4/5")} />
              <Skeleton className="mt-2.5 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export type CategoryRow = Pick<Tables<"categories">, "id" | "slug" | "name" | "description">;

export async function fetchCategories(): Promise<CategoryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, description")
    .order("sort_order")
    .order("name");
  return data ?? [];
}

/** Published thread count per category; moderators would otherwise also count pending ones. */
export async function fetchCategoriesWithCounts() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("id, slug, name, description, threads:threads!threads_category_id_fkey(count)")
    .eq("threads.status", "published")
    .order("sort_order")
    .order("name");
  return (data ?? []).map(({ threads, ...category }) => ({ ...category, threadCount: threads[0]?.count ?? 0 }));
}
