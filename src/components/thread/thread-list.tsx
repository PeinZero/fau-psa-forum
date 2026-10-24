import { ArrowBigUp, CircleCheck, Inbox, MessageSquare, PenLine, Pin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { announcementExcerpt } from "@/components/announcements/excerpt";
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
  author:profiles!threads_author_id_fkey(display_name, affiliation, role)
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
    <ul className={listFrame}>
      {threads.map((thread, i) => (
        <ThreadRow key={thread.id} thread={thread} index={i} hideCategory={hideCategory} />
      ))}
    </ul>
  );
}

/** Server components render once per request, so reading the clock here cannot drift between renders. */
function sinceNow(iso: string): string {
  return relativeTime(iso, Date.now());
}

// Rows bleed into the gutter so their hover fill lines up with the text above and below the list.
const listFrame = "-mx-3 flex flex-col divide-y divide-border sm:-mx-4";
const rowFrame = "flex gap-4 rounded-lg px-3 py-4 sm:px-4";

function ThreadRow({
  thread,
  index,
  hideCategory,
}: {
  thread: ThreadListRow;
  index: number;
  hideCategory: boolean;
}) {
  const author = thread.author?.display_name ?? "Deleted user";
  return (
    <li
      className={cn(
        rowFrame,
        "animate-fade-up group relative transition-colors duration-150 ease-out hover:bg-surface-hover",
        "has-[.row-link:focus-visible]:outline-2 has-[.row-link:focus-visible]:-outline-offset-2 has-[.row-link:focus-visible]:outline-ring",
      )}
      style={stagger(index)}
    >
      <Score score={thread.score} className="max-sm:hidden" />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 overflow-hidden text-meta text-muted">
          {thread.category && !hideCategory && (
            <>
              <Link
                href={`/c/${thread.category.slug}`}
                className="relative z-10 inline-flex min-w-0 shrink-0 items-center gap-1.5 rounded-sm font-medium text-foreground/85 transition-colors hover:text-accent"
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
          <span className="min-w-0 truncate" title={author}>
            {author}
          </span>
          <Dot />
          <time
            dateTime={thread.created_at}
            title={formatDate(thread.created_at)}
            className="shrink-0 whitespace-nowrap"
          >
            {sinceNow(thread.created_at)}
          </time>
        </p>
        <h3 className="mt-1 line-clamp-3 text-title font-semibold text-pretty break-words text-foreground sm:line-clamp-2">
          <Link
            href={`/t/${thread.slug}`}
            className="row-link rounded-sm after:absolute after:inset-0 after:rounded-lg focus-visible:outline-none"
          >
            {thread.title}
          </Link>
        </h3>
        {thread.excerpt && <p className="mt-1 line-clamp-2 text-body break-words text-muted">{thread.excerpt}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-meta text-muted">
          <Score score={thread.score} inline className="sm:hidden" />
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <MessageSquare aria-hidden strokeWidth={1.75} className="size-4 text-subtle" />
            {countLabel(thread.comment_count, "comment")}
          </span>
          <StatusPills thread={thread} />
        </div>
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

/** Display only; voting happens on the thread page. */
function Score({ score, inline = false, className }: { score: number; inline?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center text-meta font-semibold tabular-nums",
        score > 0 ? "text-foreground" : "text-muted",
        inline ? "gap-1" : "w-8 flex-col gap-0.5 pt-0.5",
        className,
      )}
    >
      <ArrowBigUp
        aria-hidden
        strokeWidth={1.75}
        className={cn("size-5", score > 0 ? "fill-accent-soft text-accent" : "text-subtle")}
      />
      <span className="sr-only">Score </span>
      {score}
    </span>
  );
}

function StatusPills({ thread }: { thread: ThreadListRow }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5 empty:hidden">
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
            <div className="flex w-8 shrink-0 flex-col items-center gap-1.5 pt-0.5 max-sm:hidden">
              <Skeleton className="size-5 rounded-md" />
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <Skeleton className="my-1 h-3 w-48 max-w-full" />
              <Skeleton className={cn("mt-2.5 h-[1.125rem]", i % 2 ? "w-2/3" : "w-4/5")} />
              <Skeleton className="mt-3 h-3.5 w-full" />
              <Skeleton className="mt-2 h-3.5 w-3/4" />
              <Skeleton className="mt-4 h-4 w-28" />
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
