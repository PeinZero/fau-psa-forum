import { CheckCircle2, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Author } from "@/components/author";
import { ActionButton } from "@/components/mod/action-button";
import { moderateComment, moderateThread, setReportStatus } from "@/components/mod/actions";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { stagger } from "@/components/ui/motion";
import { formatDate } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reports" };

type Status = Enums<"report_status">;
type Reason = Enums<"report_reason">;

const tabs: { status: Status; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "resolved", label: "Resolved" },
  { status: "dismissed", label: "Dismissed" },
];

const reasonLabels: Record<Reason, string> = {
  spam: "Spam",
  offensive: "Offensive",
  wrong_info: "Wrong information",
  personal_data: "Personal data",
  other: "Other",
};

const reasonVariants: Record<Reason, BadgeVariant> = {
  spam: "warning",
  offensive: "danger",
  wrong_info: "warning",
  personal_data: "danger",
  other: "neutral",
};

const SNIPPET_LENGTH = 280;

function snippet(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > SNIPPET_LENGTH ? `${flat.slice(0, SNIPPET_LENGTH).trimEnd()}…` : flat;
}

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = tabs.find((tab) => tab.status === params.status)?.status ?? "open";

  const supabase = await createClient();
  const { data: reports, error } = await supabase
    .from("reports")
    .select(
      `id, reason, details, status, created_at,
       reporter:profiles!reports_reporter_id_fkey(display_name, affiliation, role),
       thread:threads!reports_thread_id_fkey(id, slug, title, body, status),
       comment:comments!reports_comment_id_fkey(id, body, hidden_at, thread:threads!comments_thread_id_fkey(id, slug, title))`,
    )
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="grid gap-5">
      <SegmentedLinks
        label="Report status"
        items={tabs.map((tab) => ({
          href: tab.status === "open" ? "/mod/reports" : `/mod/reports?status=${tab.status}`,
          label: tab.label,
          current: tab.status === status,
        }))}
      />

      {error ? (
        <p role="alert" className="text-body text-danger">Could not load reports. Please reload.</p>
      ) : !reports.length ? (
        <EmptyState icon={<CheckCircle2 />} title={status === "open" ? "All caught up" : `No ${status} reports`}>
          {status === "open" ? "Nothing has been flagged. Reports from members show up here." : "Reports you move here are kept for reference."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {reports.map((report, index) => {
            const comment = report.comment;
            const thread = comment ? comment.thread : report.thread;
            const content = comment ? comment.body : report.thread?.body;
            const href = thread ? `/t/${thread.slug}${comment ? `#comment-${comment.id}` : ""}` : null;

            return (
              <li key={report.id} style={stagger(index)} className="animate-fade-up">
                <Card className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={reasonVariants[report.reason]}>{reasonLabels[report.reason]}</Badge>
                    <Badge>{comment ? "Comment" : "Thread"}</Badge>
                    {comment?.hidden_at && <Badge variant="warning">Hidden</Badge>}
                    <time dateTime={report.created_at} className="ml-auto text-meta text-muted">
                      {formatDate(report.created_at)}
                    </time>
                  </div>

                  <div className="min-w-0">
                    {thread && href ? (
                      <Link
                        href={href}
                        className="inline-flex min-h-11 max-w-full items-center gap-1.5 break-words text-small font-medium hover:underline"
                      >
                        <span className="min-w-0 break-words">{thread.title}</span>
                        <ExternalLink aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-muted" />
                      </Link>
                    ) : (
                      <p className="text-small text-muted">The reported content is no longer available.</p>
                    )}
                    {content && (
                      <blockquote className="mt-1 break-words border-l-2 border-border-strong pl-3 text-meta text-muted">
                        {snippet(content)}
                      </blockquote>
                    )}
                  </div>

                  {report.details && (
                    <p className="whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-meta">
                      <span className="mb-0.5 block font-medium text-muted">Details</span>
                      {report.details}
                    </p>
                  )}

                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
                    <span>Reported by</span>
                    <Author profile={report.reporter} />
                  </p>

                  <div className="flex flex-wrap items-start gap-2 border-t border-border pt-4">
                    {report.status === "open" ? (
                      <>
                        <ActionButton
                          action={setReportStatus}
                          fields={{ reportId: report.id, status: "resolved" }}
                          label="Resolve"
                          variant="primary"
                        />
                        <ActionButton
                          action={setReportStatus}
                          fields={{ reportId: report.id, status: "dismissed" }}
                          label="Dismiss"
                          variant="secondary"
                        />
                        {comment && thread && !comment.hidden_at && (
                          <ActionButton
                            action={moderateComment}
                            fields={{ threadId: thread.id, commentId: comment.id, op: "hide" }}
                            label="Hide comment"
                            variant="danger"
                            confirm="Hide this comment from the public?"
                          />
                        )}
                        {!comment && report.thread?.status === "published" && (
                          <ActionButton
                            action={moderateThread}
                            fields={{ threadId: report.thread.id, op: "archive" }}
                            label="Archive thread"
                            variant="danger"
                            confirm="Archived threads become read-only and disappear from lists."
                          />
                        )}
                      </>
                    ) : (
                      <ActionButton
                        action={setReportStatus}
                        fields={{ reportId: report.id, status: "open" }}
                        label="Reopen"
                        variant="secondary"
                      />
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
