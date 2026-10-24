import { CircleCheck, Inbox, MapPin, MessageSquare, PenLine, Pin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { BrowsePeriod, BrowseSort, BrowseCity } from "@/components/browse/params";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { VerifiedBadge } from "@/components/update-requests/verified";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { cityLabels, formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { relativeTime } from "@/lib/time";

const listSelect = `
  id, slug, title, city, is_outdated, is_pinned, status, created_at, last_activity_at, last_verified_at,
  score, comment_count, best_comment_id,
  category:categories!threads_category_id_fkey(slug, name),
  author:profiles!threads_author_id_fkey(display_name, affiliation, role),
  comments:comments!comments_thread_id_fkey(count)
`;

export async function fetchThreadsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("threads").select(listSelect).in("id", ids);
  const rows = data ?? [];
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

const listFrame = cardClasses({ padding: "none", className: "overflow-hidden divide-y divide-border" });

function ThreadRow({
  thread,
  index,
  hideCategory,
}: {
  thread: ThreadListRow;
  index: number;
  hideCategory: boolean;
}) {
  return (
    <li className="animate-fade-up" style={stagger(index)}>
      <Link
        href={`/t/${thread.slug}`}
        className="group flex items-start gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-surface-hover focus-visible:-outline-offset-2 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium leading-snug text-foreground break-words">{thread.title}</h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-meta text-muted">
            <ThreadBadges thread={thread} hideCategory={hideCategory} />
            <span className="inline-flex min-w-0 items-center gap-x-2">
              <span className="truncate">{thread.author?.display_name ?? "Deleted user"}</span>
              <span aria-hidden className="text-subtle">
                ·
              </span>
              <time dateTime={thread.created_at} title={formatDate(thread.created_at)} className="whitespace-nowrap">
                {sinceNow(thread.created_at)}
              </time>
            </span>
          </div>
        </div>
        <ThreadStats score={thread.score} comments={thread.comment_count} />
      </Link>
    </li>
  );
}

function ThreadStats({ score, comments }: { score: number; comments: number }) {
  return (
    <span className="mt-0.5 flex shrink-0 items-center gap-3 text-meta tabular-nums text-subtle transition-colors group-hover:text-muted">
      {score !== 0 && (
        <span
          className={score > 0 ? "inline-flex items-center gap-1 text-accent" : "inline-flex items-center gap-1"}
          aria-label={`Score ${score}`}
        >
          <span aria-hidden className="text-[9px]">
            {score > 0 ? "▲" : "▼"}
          </span>
          {Math.abs(score)}
        </span>
      )}
      <span
        className="inline-flex items-center gap-1"
        aria-label={`${comments} ${comments === 1 ? "comment" : "comments"}`}
      >
        <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5" />
        {comments}
      </span>
    </span>
  );
}

function ThreadBadges({ thread, hideCategory }: { thread: ThreadListRow; hideCategory: boolean }) {
  return (
    <>
      {thread.is_pinned && (
        <Badge variant="accent">
          <Pin aria-hidden strokeWidth={1.75} />
          Pinned
        </Badge>
      )}
      {thread.best_comment_id !== null && (
        <Badge variant="accent">
          <CircleCheck aria-hidden strokeWidth={1.75} />
          Answered
        </Badge>
      )}
      {thread.category && !hideCategory && <Badge>{thread.category.name}</Badge>}
      {thread.city && (
        <Badge>
          <MapPin aria-hidden strokeWidth={1.75} />
          {cityLabels[thread.city]}
        </Badge>
      )}
      {thread.is_outdated && <Badge variant="warning">Outdated</Badge>}
      {thread.last_verified_at && <VerifiedBadge at={thread.last_verified_at} />}
    </>
  );
}

export function ThreadListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading threads…</span>
      <div className={listFrame}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 sm:px-5">
            <div className="flex-1">
              <Skeleton className={i % 2 ? "h-4 w-2/3" : "h-4 w-4/5"} />
              <div className="mt-2.5 flex gap-2">
                <Skeleton className="h-4 w-20 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-4 w-8" />
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
