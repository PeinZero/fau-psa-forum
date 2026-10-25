import { CheckCircle2, ExternalLink, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { Author } from "@/components/author";
import { ActionButton } from "@/components/mod/action-button";
import { Diff } from "@/components/mod/diff";
import { markAllRevisionsReviewed, setRevisionsReviewed } from "@/components/mod/edit-review-actions";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Recent edits" };

type Tab = "review" | "reviewed";
type Snapshot = { title: string; body: string };

const QUEUE_LIMIT = 200;
const REVIEWED_LIMIT = 50;

const REVISION_FIELDS = `id, thread_id, title, body, created_at, edited_by, reviewed_at,
  editor:profiles!thread_revisions_edited_by_fkey(display_name, affiliation, role),
  reviewer:profiles!thread_revisions_reviewed_by_fkey(display_name, affiliation, role),
  thread:threads!thread_revisions_thread_id_fkey(slug, title, body)`;

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function RecentEditsPage({ searchParams }: Props) {
  const tab: Tab = (await searchParams).tab === "reviewed" ? "reviewed" : "review";

  const supabase = await createClient();
  const base = supabase.from("thread_revisions").select(REVISION_FIELDS);
  const { data: revisions, error } = await (tab === "review"
    ? base.is("reviewed_at", null).order("id", { ascending: false }).limit(QUEUE_LIMIT)
    : base.not("reviewed_at", "is", null).order("reviewed_at", { ascending: false }).limit(REVIEWED_LIMIT));

  // A revision stores the text before an edit, so the text after it is the next revision of the
  // same thread, or the live thread when no later edit exists.
  const threadIds = [...new Set((revisions ?? []).map((revision) => revision.thread_id))];
  const oldestId = Math.min(...(revisions ?? []).map((revision) => revision.id));
  const { data: later, error: laterError } = threadIds.length
    ? await supabase
        .from("thread_revisions")
        .select("id, thread_id, title, body")
        .in("thread_id", threadIds)
        .gt("id", oldestId)
        .order("id", { ascending: true })
    : { data: [], error: null };

  const header = (
    <SegmentedLinks
      label="Edit review status"
      items={[
        { href: "/mod/edits", label: "To review", current: tab === "review" },
        { href: "/mod/edits?tab=reviewed", label: "Reviewed", current: tab === "reviewed" },
      ]}
    />
  );

  if (error || laterError) {
    return (
      <div className="grid gap-5">
        {header}
        <p role="alert" className="text-body text-danger">Could not load edits. Please reload.</p>
      </div>
    );
  }

  type Revision = (typeof revisions)[number];
  const textAfter = (revision: Revision): Snapshot | null =>
    later.find((next) => next.thread_id === revision.thread_id && next.id > revision.id) ?? revision.thread;

  if (!revisions.length) {
    return (
      <div className="grid gap-5">
        {header}
        {tab === "review" ? (
          <EmptyState icon={<CheckCircle2 />} title="All caught up">
            Every thread edit has been reviewed.
          </EmptyState>
        ) : (
          <EmptyState icon={<History />} title="No reviewed edits yet">
            Edits you mark as reviewed show up here.
          </EmptyState>
        )}
      </div>
    );
  }

  if (tab === "reviewed") {
    return (
      <div className="grid gap-5">
        {header}
        <ul className="grid gap-3">
          {revisions.map((revision, index) => (
            <li key={revision.id} style={stagger(index)} className="animate-fade-up">
              <EditCard
                revision={revision}
                before={revision}
                after={textAfter(revision)}
                meta={
                  <>
                    <MetaLine label="Edited by" profiles={[revision.editor]} date={revision.created_at} />
                    {revision.reviewed_at && (
                      <MetaLine label="Reviewed by" profiles={[revision.reviewer]} date={revision.reviewed_at} />
                    )}
                  </>
                }
                action={
                  <ActionButton
                    action={setRevisionsReviewed}
                    fields={{ revisionIds: String(revision.id), op: "unreview" }}
                    label="Mark unreviewed"
                    variant="secondary"
                  />
                }
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Newest first; several unreviewed edits of one thread are reviewed together as one change.
  const groups = new Map<number, Revision[]>();
  for (const revision of revisions) groups.set(revision.thread_id, [...(groups.get(revision.thread_id) ?? []), revision]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {header}
        <ActionButton
          action={markAllRevisionsReviewed}
          fields={{ upTo: revisions[0].id }}
          label="Mark all reviewed"
          confirm="Mark every edit in the queue as reviewed?"
          variant="secondary"
        />
      </div>
      <ul className="grid gap-3">
        {[...groups.values()].map((group, index) => {
          const newest = group[0];
          const oldest = group[group.length - 1];
          const editors = [...new Map(group.map((revision) => [revision.edited_by, revision.editor])).values()];
          return (
            <li key={newest.thread_id} style={stagger(index)} className="animate-fade-up">
              <EditCard
                revision={newest}
                before={oldest}
                after={textAfter(newest)}
                meta={
                  <MetaLine
                    label={group.length > 1 ? `${group.length} edits by` : "Edited by"}
                    profiles={editors}
                    date={newest.created_at}
                  />
                }
                action={
                  <ActionButton
                    action={setRevisionsReviewed}
                    fields={{ revisionIds: group.map((revision) => revision.id).join(","), op: "review" }}
                    label="Mark reviewed"
                    variant="primary"
                  />
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Profile = Parameters<typeof Author>[0]["profile"];

function MetaLine({ label, profiles, date }: { label: string; profiles: Profile[]; date: string }) {
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
      <span>{label}</span>
      {profiles.map((profile, index) => (
        <Author key={index} profile={profile} />
      ))}
      <time dateTime={date}>{formatDate(date)}</time>
    </p>
  );
}

function EditCard({
  revision,
  before,
  after,
  meta,
  action,
}: {
  revision: { title: string; thread: { slug: string; title: string } | null };
  before: Snapshot;
  after: Snapshot | null;
  meta: ReactNode;
  action: ReactNode;
}) {
  const titleChanged = after && after.title !== before.title;
  const bodyChanged = after && after.body !== before.body;
  return (
    <Card className="grid gap-4">
      <div className="min-w-0">
        <h2 className="break-words text-title font-semibold tracking-tight">
          {revision.thread ? (
            <Link href={`/t/${revision.thread.slug}`} className="hover:underline">
              {revision.thread.title}
            </Link>
          ) : (
            revision.title
          )}
        </h2>
        {meta}
      </div>
      {titleChanged && (
        <div>
          <p className="mb-1.5 text-meta font-medium text-muted">Title</p>
          <Diff before={before.title} after={after.title} />
        </div>
      )}
      {bodyChanged && (
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-meta font-medium text-muted hover:text-foreground">
            Compare text
          </summary>
          <div className="mt-1">
            <Diff before={before.body} after={after.body} />
          </div>
        </details>
      )}
      {after && !titleChanged && !bodyChanged && (
        <p className="text-meta text-muted">The text is back to its earlier version.</p>
      )}
      <div className="flex flex-wrap items-start gap-2 border-t border-border pt-4">
        {action}
        {revision.thread && (
          <Link href={`/t/${revision.thread.slug}`} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            View thread
            <ExternalLink aria-hidden strokeWidth={1.75} />
          </Link>
        )}
      </div>
    </Card>
  );
}
