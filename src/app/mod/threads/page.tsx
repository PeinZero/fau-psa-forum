import { CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PossibleDuplicates } from "@/components/duplicates/possible-duplicates";
import { findSimilarThreads } from "@/components/duplicates/server";
import { Author } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { ActionButton } from "@/components/mod/action-button";
import { moderateThread } from "@/components/mod/actions";
import { getCannedReplies } from "@/components/mod/canned-replies";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { cityLabels, formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pending threads" };

export default async function PendingThreadsPage() {
  const supabase = await createClient();
  const { data: threads, error } = await supabase
    .from("threads")
    .select(
      "id, slug, title, body, city, created_at, author:profiles!threads_author_id_fkey(display_name, affiliation, role), category:categories!threads_category_id_fkey(name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return <p role="alert" className="text-danger">Could not load threads. Please reload.</p>;
  if (!threads.length) {
    return <EmptyState icon={<CheckCircle2 />} title="All caught up">No threads are waiting for review.</EmptyState>;
  }

  const [duplicates, presets] = await Promise.all([
    Promise.all(threads.map((thread) => findSimilarThreads(thread.title))),
    getCannedReplies(),
  ]);

  return (
    <ul className="grid gap-3">
      {threads.map((thread, index) => (
        <li key={thread.id} style={stagger(index)} className="animate-fade-up">
          <Card className="grid gap-4">
            <div className="min-w-0">
              <h2 className="break-words text-base font-semibold tracking-tight">
                <Link href={`/t/${thread.slug}`} className="hover:underline">
                  {thread.title}
                </Link>
              </h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
                <Author profile={thread.author} />
                {thread.category?.name && <Badge>{thread.category.name}</Badge>}
                {thread.city && <span>{cityLabels[thread.city]}</span>}
                <span>{formatDate(thread.created_at)}</span>
              </p>
            </div>
            <details className="group">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-meta font-medium text-muted hover:text-foreground">
                Show text
              </summary>
              <div className="mt-1 min-w-0 break-words rounded-lg border border-border bg-background p-3">
                <Markdown>{thread.body}</Markdown>
              </div>
            </details>
            <PossibleDuplicates threads={duplicates[index]} />
            <div className="flex flex-wrap items-start gap-2 border-t border-border pt-4">
              <ActionButton
                action={moderateThread}
                fields={{ threadId: thread.id, op: "approve" }}
                label="Approve"
                pendingLabel="Approving..."
                variant="primary"
              />
              <ActionButton
                action={moderateThread}
                fields={{ threadId: thread.id, op: "reject" }}
                label="Reject"
                variant="danger"
                confirm="The author sees this reason."
                reason={{ label: "Reason for rejection", max: 1000, presets }}
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
