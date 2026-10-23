import { CheckCircle2, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Author } from "@/components/author";
import { ActionButton } from "@/components/mod/action-button";
import { markThreadVerified, setUpdateRequestStatus } from "@/components/mod/actions";
import { VerifiedBadge } from "@/components/update-requests/verified";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { formatDate, statusLabels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Update requests" };

export default async function UpdateRequestsPage() {
  const supabase = await createClient();
  const { data: requests, error } = await supabase
    .from("update_requests")
    .select(
      `id, note, created_at,
       requester:profiles!update_requests_requester_id_fkey(display_name, affiliation, role),
       thread:threads!update_requests_thread_id_fkey(id, slug, title, status, is_outdated, last_verified_at)`,
    )
    .eq("status", "open")
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) {
    return (
      <p role="alert" className="text-danger">
        Could not load update requests. Please reload.
      </p>
    );
  }

  if (!requests.length) {
    return (
      <EmptyState icon={<CheckCircle2 />} title="No open update requests">
        When members spot details that may have changed, their requests show up here.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5">
      <p className="text-meta text-muted">
        Oldest first. Marking a thread as verified resolves every open request on it.
      </p>
      <ul className="grid gap-3">
        {requests.map((request, index) => {
          const thread = request.thread;
          return (
            <li key={request.id} style={stagger(index)} className="animate-fade-up">
              <Card className="grid gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {thread?.last_verified_at ? <VerifiedBadge at={thread.last_verified_at} /> : <Badge>Never verified</Badge>}
                  {thread?.is_outdated && <Badge variant="warning">Outdated</Badge>}
                  {thread && thread.status !== "published" && <Badge>{statusLabels[thread.status]}</Badge>}
                  <time dateTime={request.created_at} className="ml-auto text-meta text-muted">
                    {formatDate(request.created_at)}
                  </time>
                </div>

                {thread ? (
                  <Link
                    href={`/t/${thread.slug}`}
                    className="inline-flex min-h-11 max-w-full items-center gap-1.5 break-words text-sm font-medium hover:underline"
                  >
                    <span className="min-w-0 break-words">{thread.title}</span>
                    <ExternalLink aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-muted" />
                  </Link>
                ) : (
                  <p className="text-sm text-muted">The thread is no longer available.</p>
                )}

                {request.note ? (
                  <p className="whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-meta">
                    <span className="mb-0.5 block font-medium text-muted">Note</span>
                    {request.note}
                  </p>
                ) : (
                  <p className="text-meta text-subtle">No note given.</p>
                )}

                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
                  <span>Requested by</span>
                  <Author profile={request.requester} />
                </p>

                <div className="flex flex-wrap items-start gap-2 border-t border-border pt-4">
                  {thread?.status === "published" && (
                    <ActionButton
                      action={markThreadVerified}
                      fields={{ threadId: thread.id }}
                      label="Mark thread verified"
                      variant="primary"
                    />
                  )}
                  <ActionButton
                    action={setUpdateRequestStatus}
                    fields={{ requestId: request.id, status: "resolved" }}
                    label="Resolve"
                    variant="secondary"
                  />
                  <ActionButton
                    action={setUpdateRequestStatus}
                    fields={{ requestId: request.id, status: "dismissed" }}
                    label="Dismiss"
                    variant="ghost"
                  />
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
