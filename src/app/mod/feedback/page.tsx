import { CheckCircle2, MessageSquareHeart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActionButton } from "@/components/mod/action-button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

import { deleteFeedback, markFeedbackHandled, markFeedbackNew } from "./actions";

export const metadata: Metadata = { title: "Feedback" };

const LIMIT = 200;

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
});

const tabs = [
  { status: "new", label: "New" },
  { status: "handled", label: "Handled" },
] as const;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function FeedbackPage({ searchParams }: Props) {
  const params = await searchParams;
  const handled = params.status === "handled";

  const supabase = await createClient();
  const base = supabase
    .from("feedback")
    .select(
      `id, message, page, created_at, handled_at,
       author:profiles!feedback_user_id_fkey(display_name, username),
       handler:profiles!feedback_handled_by_fkey(display_name, username)`,
    );
  const { data: rows, error } = await (handled
    ? base.not("handled_at", "is", null).order("handled_at", { ascending: false })
    : base.is("handled_at", null).order("created_at", { ascending: false })
  )
    .order("id", { ascending: false })
    .limit(LIMIT);

  return (
    <div className="grid gap-5">
      <p className="max-w-prose text-sm text-muted">
        Notes members sent with the feedback button. Only moderators see them; mark one handled once someone has
        looked at it.
      </p>

      <SegmentedLinks
        label="Feedback status"
        items={tabs.map((tab) => ({
          href: tab.status === "new" ? "/mod/feedback" : `/mod/feedback?status=${tab.status}`,
          label: tab.label,
          current: (tab.status === "handled") === handled,
        }))}
      />

      {error ? (
        <p role="alert" className="text-danger">Could not load feedback. Please reload.</p>
      ) : rows.length === 0 ? (
        handled ? (
          <EmptyState icon={<MessageSquareHeart />} title="No handled feedback">
            Feedback you mark as handled moves here.
          </EmptyState>
        ) : (
          <EmptyState icon={<CheckCircle2 />} title="All caught up">
            No new feedback. Messages sent with the feedback button show up here.
          </EmptyState>
        )
      ) : (
        <ul className="grid gap-3">
          {rows.map((row, index) => (
            <li key={row.id} style={stagger(index)} className="animate-fade-up">
              <Card className="grid gap-3">
                <p className="whitespace-pre-wrap break-words text-body text-foreground">{row.message}</p>
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
                <div className="flex flex-wrap items-start gap-2 border-t border-border pt-3">
                  {row.handled_at ? (
                    <p className="w-full pt-1 text-meta text-muted">
                      Handled by{" "}
                      {row.handler ? (
                        <Link
                          href={`/u/${row.handler.username}`}
                          className="font-medium text-foreground underline-offset-2 hover:underline"
                        >
                          {row.handler.display_name}
                        </Link>
                      ) : (
                        "a former moderator"
                      )}{" "}
                      on <time dateTime={row.handled_at}>{dateTime.format(new Date(row.handled_at))}</time>
                    </p>
                  ) : null}
                  {row.handled_at ? (
                    <ActionButton action={markFeedbackNew} fields={{ feedbackId: row.id }} label="Mark new" />
                  ) : (
                    <ActionButton
                      action={markFeedbackHandled}
                      fields={{ feedbackId: row.id }}
                      label="Mark handled"
                      variant="primary"
                    />
                  )}
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
      {rows?.length === LIMIT ? <p className="text-meta text-muted">Showing the newest {LIMIT}.</p> : null}
    </div>
  );
}
