import { Inbox, MapPin, MessageSquare, PenLine, Pin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { cityLabels, formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

const LIST_LIMIT = 30;

const listSelect = `
  id, slug, title, city, is_outdated, is_pinned, status, created_at, last_activity_at,
  category:categories!threads_category_id_fkey(slug, name),
  author:profiles!threads_author_id_fkey(display_name, affiliation, role),
  comments:comments!comments_thread_id_fkey(count)
`;

export async function fetchThreadList(options: {
  categoryId?: number;
  city?: "erlangen" | "nuremberg";
}) {
  const supabase = await createClient();
  let query = supabase.from("threads").select(listSelect).eq("status", "published");
  if (options.categoryId !== undefined) query = query.eq("category_id", options.categoryId);
  if (options.city) query = query.or(`city.in.(${options.city},both),city.is.null`);
  const { data } = await query
    .order("is_pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .limit(LIST_LIMIT);
  return data ?? [];
}

export async function fetchThreadsByIds(ids: number[]) {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("threads").select(listSelect).in("id", ids);
  const rows = data ?? [];
  return ids.flatMap((id) => rows.filter((row) => row.id === id));
}

type ListRow = Awaited<ReturnType<typeof fetchThreadList>>[number];

export type ThreadListProps = {
  threads: ListRow[];
  emptyText: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
};

const askAction = (
  <Link href="/new" className={buttonClasses({ variant: "secondary", size: "sm" })}>
    <PenLine strokeWidth={1.75} />
    Ask a question
  </Link>
);

export function ThreadList({ threads, emptyText, emptyDescription, emptyAction = askAction }: ThreadListProps) {
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
        <ThreadRow key={thread.id} thread={thread} index={i} />
      ))}
    </ul>
  );
}

const listFrame = cardClasses({ padding: "none", className: "overflow-hidden divide-y divide-border" });

function ThreadRow({ thread, index }: { thread: ListRow; index: number }) {
  const commentCount = thread.comments[0]?.count ?? 0;
  return (
    <li className="animate-fade-up" style={stagger(index)}>
      <Link
        href={`/t/${thread.slug}`}
        className="group flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 ease-out hover:bg-surface-hover focus-visible:-outline-offset-2 sm:px-5"
      >
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-medium leading-snug text-foreground break-words">
            {thread.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-meta text-muted">
            <ThreadBadges thread={thread} />
            <span className="inline-flex min-w-0 items-center gap-x-2">
              <span className="truncate">{thread.author?.display_name ?? "Deleted user"}</span>
              <span aria-hidden className="text-subtle">·</span>
              <time dateTime={thread.created_at} className="whitespace-nowrap">
                {formatDate(thread.created_at)}
              </time>
            </span>
          </div>
        </div>
        <span
          className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-meta tabular-nums text-subtle transition-colors group-hover:text-muted"
          aria-label={`${commentCount} ${commentCount === 1 ? "comment" : "comments"}`}
        >
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5" />
          {commentCount}
        </span>
      </Link>
    </li>
  );
}

function ThreadBadges({ thread }: { thread: ListRow }) {
  return (
    <>
      {thread.is_pinned && (
        <Badge variant="accent">
          <Pin aria-hidden strokeWidth={1.75} />
          Pinned
        </Badge>
      )}
      {thread.category && <Badge>{thread.category.name}</Badge>}
      {thread.city && (
        <Badge>
          <MapPin aria-hidden strokeWidth={1.75} />
          {cityLabels[thread.city]}
        </Badge>
      )}
      {thread.is_outdated && <Badge variant="warning">Outdated</Badge>}
    </>
  );
}

export function ThreadListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading threads…</span>
      <div className={listFrame}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
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
