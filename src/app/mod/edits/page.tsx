import { History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Author } from "@/components/author";
import { Diff } from "@/components/mod/diff";
import { recentEditsCutoff } from "@/components/mod/recent";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recent edits" };

export default async function RecentEditsPage() {
  const supabase = await createClient();
  const { data: revisions, error } = await supabase
    .from("thread_revisions")
    .select(
      "id, title, body, created_at, editor:profiles!thread_revisions_edited_by_fkey(display_name, affiliation, role), thread:threads!thread_revisions_thread_id_fkey(slug, title, body)",
    )
    .gte("created_at", recentEditsCutoff())
    .order("created_at", { ascending: false });

  if (error) return <p role="alert" className="text-danger">Could not load edits. Please reload.</p>;
  if (!revisions.length) {
    return <EmptyState icon={<History />} title="No recent edits">No live thread was edited in the last 7 days.</EmptyState>;
  }

  return (
    <ul className="grid gap-3">
      {revisions.map((revision, index) => {
        const titleChanged = revision.thread && revision.thread.title !== revision.title;
        const bodyChanged = revision.thread && revision.thread.body !== revision.body;
        return (
          <li key={revision.id} style={stagger(index)} className="animate-fade-up">
            <Card className="grid gap-4">
              <div className="min-w-0">
                <h2 className="break-words text-base font-semibold tracking-tight">
                  {revision.thread ? (
                    <Link href={`/t/${revision.thread.slug}`} className="hover:underline">
                      {revision.thread.title}
                    </Link>
                  ) : (
                    revision.title
                  )}
                </h2>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
                  <span>Edited by</span>
                  <Author profile={revision.editor} />
                  <span>{formatDate(revision.created_at)}</span>
                </p>
              </div>
              {titleChanged && revision.thread && (
                <div>
                  <p className="mb-1.5 text-meta font-medium text-muted">Title</p>
                  <Diff before={revision.title} after={revision.thread.title} />
                </div>
              )}
              {bodyChanged && revision.thread && (
                <details>
                  <summary className="inline-flex min-h-11 cursor-pointer items-center text-meta font-medium text-muted hover:text-foreground">
                    Compare text
                  </summary>
                  <div className="mt-1">
                    <Diff before={revision.body} after={revision.thread.body} />
                  </div>
                </details>
              )}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
