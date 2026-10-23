import type { Metadata } from "next";
import Link from "next/link";

import { Author } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { recentEditsCutoff } from "@/components/mod/recent";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recent edits" };

export default async function RecentEditsPage() {
  const supabase = await createClient();
  const since = recentEditsCutoff();
  const { data: revisions, error } = await supabase
    .from("thread_revisions")
    .select(
      "id, title, body, created_at, editor:profiles!thread_revisions_edited_by_fkey(display_name, affiliation, role), thread:threads!thread_revisions_thread_id_fkey(slug, title, body)",
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) return <p role="alert">Could not load edits. Please reload.</p>;
  if (!revisions.length) return <p className="text-muted">No edits in the last 7 days.</p>;

  return (
    <ul className="grid gap-4">
      {revisions.map((revision) => {
        const titleChanged = revision.thread && revision.thread.title !== revision.title;
        const bodyChanged = revision.thread && revision.thread.body !== revision.body;
        return (
          <li key={revision.id} className="grid gap-3 rounded-md border border-border p-4">
            <div>
              <h2 className="break-words text-lg font-semibold">
                {revision.thread ? (
                  <Link href={`/t/${revision.thread.slug}`} className="hover:underline">
                    {revision.thread.title}
                  </Link>
                ) : (
                  revision.title
                )}
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                <span>Edited by</span>
                <Author profile={revision.editor} />
                <span>{formatDate(revision.created_at)}</span>
              </p>
            </div>
            {titleChanged && (
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="break-words">
                  <span className="block font-medium text-muted">Before</span>
                  {revision.title}
                </p>
                <p className="break-words">
                  <span className="block font-medium text-muted">After</span>
                  {revision.thread?.title}
                </p>
              </div>
            )}
            {bodyChanged && revision.thread && (
              <details>
                <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium">
                  Compare text
                </summary>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted">Before</p>
                    <Markdown>{revision.body}</Markdown>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted">After</p>
                    <Markdown>{revision.thread.body}</Markdown>
                  </div>
                </div>
              </details>
            )}
          </li>
        );
      })}
    </ul>
  );
}
