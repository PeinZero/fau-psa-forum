import { MessageSquareHeart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActionButton } from "@/components/mod/action-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

import { deleteFeedback } from "./actions";

export const metadata: Metadata = { title: "Feedback" };

const LIMIT = 200;

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

export default async function FeedbackPage() {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("feedback")
    .select("id, message, page, created_at, author:profiles!feedback_user_id_fkey(display_name, username)")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(LIMIT);

  if (error) return <p role="alert" className="text-danger">Could not load feedback. Please reload.</p>;

  return (
    <div className="grid gap-6">
      <p className="max-w-prose text-sm text-muted">
        Notes members sent with the feedback button, newest first. Only moderators see them; delete one once it is
        handled.
      </p>

      {rows.length === 0 ? (
        <EmptyState icon={<MessageSquareHeart />} title="No feedback yet">
          When members send feedback from the site, it shows up here.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {rows.map((row, index) => (
            <li key={row.id} style={stagger(index)} className="animate-fade-up">
              <Card className="grid gap-3">
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">{row.message}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
                  <span>
                    {row.author ? (
                      <Link
                        href={`/u/${row.author.username}`}
                        className="font-medium text-foreground underline-offset-2 hover:underline"
                      >
                        {row.author.display_name}
                      </Link>
                    ) : (
                      "Deleted user"
                    )}
                  </span>
                  <time dateTime={row.created_at}>{dateTime.format(new Date(row.created_at))}</time>
                  {row.page ? (
                    <Link
                      href={safeNextPath(row.page)}
                      className="min-w-0 break-all font-mono text-accent underline-offset-2 hover:underline"
                    >
                      {row.page}
                    </Link>
                  ) : null}
                </div>
                <div className="flex justify-end border-t border-border pt-3">
                  <ActionButton
                    action={deleteFeedback}
                    fields={{ feedbackId: row.id }}
                    label="Delete"
                    tone="danger"
                    confirm="Delete this feedback?"
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {rows.length === LIMIT ? (
        <p className="text-meta text-muted">Showing the newest {LIMIT}. Delete handled feedback to see older notes.</p>
      ) : null}
    </div>
  );
}
