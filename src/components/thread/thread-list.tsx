import Link from "next/link";

import { Author } from "@/components/author";
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

export function ThreadList({ threads, emptyText }: { threads: ListRow[]; emptyText: string }) {
  if (threads.length === 0) {
    return (
      <p className="rounded-lg border border-border p-4 text-muted">
        {emptyText}{" "}
        <Link href="/new" className="text-accent underline">
          Ask a question
        </Link>
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {threads.map((thread) => {
        const commentCount = thread.comments[0]?.count ?? 0;
        return (
          <li key={thread.id} className="rounded-lg border border-border p-4">
            <h3 className="text-lg font-semibold leading-snug break-words">
              <Link href={`/t/${thread.slug}`} className="inline-flex min-h-11 items-center hover:underline">
                {thread.title}
              </Link>
            </h3>
            <ThreadBadges thread={thread} />
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <Author profile={thread.author} />
              <span aria-hidden="true">·</span>
              <time dateTime={thread.created_at}>{formatDate(thread.created_at)}</time>
              <span aria-hidden="true">·</span>
              <span>
                {commentCount} {commentCount === 1 ? "comment" : "comments"}
              </span>
            </p>
          </li>
        );
      })}
    </ul>
  );
}

function ThreadBadges({ thread }: { thread: ListRow }) {
  return (
    <p className="mt-2 flex flex-wrap gap-2 text-xs">
      {thread.is_pinned && (
        <span className="rounded bg-accent px-1.5 py-0.5 font-medium text-accent-foreground">Pinned</span>
      )}
      {thread.category && (
        <Link
          href={`/c/${thread.category.slug}`}
          className="inline-flex min-h-11 items-center rounded border border-border px-1.5 text-muted hover:text-foreground"
        >
          {thread.category.name}
        </Link>
      )}
      {thread.city && (
        <span className="rounded border border-border px-1.5 py-0.5 text-muted">{cityLabels[thread.city]}</span>
      )}
      {thread.is_outdated && (
        <span className="rounded border border-border px-1.5 py-0.5 font-medium text-foreground">Outdated</span>
      )}
    </p>
  );
}

export function ThreadListSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-busy="true">
      <span className="sr-only">Loading threads…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-border/30" />
      ))}
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
