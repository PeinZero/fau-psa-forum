import type { Metadata } from "next";
import Link from "next/link";

import { Author } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { ThreadModPanel } from "@/components/mod/thread-mod-panel";
import { cityLabels, formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pending threads" };

export default async function PendingThreadsPage() {
  const supabase = await createClient();
  const { data: threads, error } = await supabase
    .from("threads")
    .select(
      "id, slug, title, body, city, status, is_outdated, is_pinned, created_at, author:profiles!threads_author_id_fkey(display_name, affiliation, role), category:categories!threads_category_id_fkey(name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return <p role="alert">Could not load threads. Please reload.</p>;
  if (!threads.length) return <p className="text-muted">No threads are waiting for review.</p>;

  return (
    <ul className="grid gap-4">
      {threads.map((thread) => (
        <li key={thread.id} className="grid gap-3 rounded-md border border-border p-4">
          <div>
            <h2 className="break-words text-lg font-semibold">
              <Link href={`/t/${thread.slug}`} className="hover:underline">
                {thread.title}
              </Link>
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <Author profile={thread.author} />
              <span>{thread.category?.name}</span>
              {thread.city && <span>{cityLabels[thread.city]}</span>}
              <span>{formatDate(thread.created_at)}</span>
            </p>
          </div>
          <details>
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium">Show text</summary>
            <div className="mt-2">
              <Markdown>{thread.body}</Markdown>
            </div>
          </details>
          <ThreadModPanel thread={thread} />
        </li>
      ))}
    </ul>
  );
}
