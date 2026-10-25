import { ChevronRight, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";

import { ActionButton } from "@/components/mod/action-button";
import { deleteCannedReply } from "@/components/mod/actions";
import { CannedReplyForm } from "@/components/mod/canned-reply-form";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Canned replies" };

export default async function CannedRepliesPage() {
  const supabase = await createClient();
  const { data: replies, error } = await supabase
    .from("canned_replies")
    .select("id, label, body, sort_order")
    .order("sort_order")
    .order("id");

  if (error) return <p role="alert" className="text-body text-danger">Could not load canned replies. Please reload.</p>;

  return (
    <div className="grid gap-8">
      <p className="max-w-prose text-small text-muted">
        Starting points for rejection reasons. Moderators pick one in the reject dialog and can still edit the text before
        sending; the author sees it.
      </p>

      <section aria-labelledby="new-reply">
        <Card>
          <h2 id="new-reply" className="mb-4 text-heading font-semibold tracking-tight">
            Add a reply
          </h2>
          <CannedReplyForm />
        </Card>
      </section>

      <section aria-labelledby="all-replies" className="grid gap-3">
        <h2 id="all-replies" className="text-heading font-semibold tracking-tight">
          All replies
        </h2>
        {replies.length === 0 ? (
          <EmptyState icon={<MessageSquareText />} title="No canned replies yet">
            Add one above and it shows up in the reject dialog.
          </EmptyState>
        ) : (
          <ul className="grid gap-3">
            {replies.map((reply, index) => (
              <li key={reply.id} style={stagger(index)} className="animate-fade-up">
                <Card padding="none">
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-2 hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                      <ChevronRight
                        aria-hidden
                        strokeWidth={1.75}
                        className="size-4 shrink-0 text-muted transition-transform duration-150 group-open:rotate-90"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-small font-medium">{reply.label}</span>
                        <span className="block truncate text-meta text-muted">{reply.body}</span>
                      </span>
                    </summary>
                    <div className="grid gap-4 border-t border-border p-4">
                      <CannedReplyForm reply={reply} />
                      <div className="border-t border-border pt-4">
                        <ActionButton
                          action={deleteCannedReply}
                          fields={{ replyId: reply.id }}
                          label="Delete reply"
                          tone="danger"
                          confirm={`Delete "${reply.label}"?`}
                        />
                      </div>
                    </div>
                  </details>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
