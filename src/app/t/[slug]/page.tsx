import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Author } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { ThreadModPanel } from "@/components/mod/thread-mod-panel";
import { PublicComments, ViewerComments } from "@/components/thread/thread-comments";
import { getThread, plainTextExcerpt, type ThreadDetail } from "@/components/thread/thread-data";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { cityLabels, formatDate, statusLabels } from "@/lib/labels";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const thread = await getThread(slug);
  if (!thread) return {};

  const description = plainTextExcerpt(thread.body);
  return {
    title: thread.title,
    description,
    openGraph: {
      type: "article",
      siteName: "FAU PSA Forum",
      title: thread.title,
      description,
      publishedTime: thread.created_at,
      modifiedTime: thread.edited_at ?? undefined,
      url: `/t/${thread.slug}`,
    },
  };
}

export default function ThreadPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className="text-muted">Loading thread...</p>}>
      <ThreadContent params={params} />
    </Suspense>
  );
}

async function ThreadContent({ params }: { params: Params }) {
  const { slug } = await params;
  const thread = await getThread(slug);
  if (!thread) notFound();

  return (
    <article className="flex flex-col gap-6">
      <Banners thread={thread} />

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight break-words">{thread.title}</h1>
        <p className="flex flex-wrap gap-2 text-sm">
          {thread.category && (
            <Link
              href={`/c/${thread.category.slug}`}
              className="inline-flex min-h-11 items-center rounded border border-border px-2 text-muted hover:text-foreground"
            >
              {thread.category.name}
            </Link>
          )}
          {thread.city && (
            <span className="rounded border border-border px-2 py-1 text-muted">
              {cityLabels[thread.city]}
            </span>
          )}
        </p>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <Author profile={thread.author} />
          <span aria-hidden="true">·</span>
          <time dateTime={thread.created_at}>{formatDate(thread.created_at)}</time>
          {thread.edited_at && (
            <span>
              (edited <time dateTime={thread.edited_at}>{formatDate(thread.edited_at)}</time>)
            </span>
          )}
        </p>
        <Suspense fallback={null}>
          <ViewerActions thread={thread} />
        </Suspense>
      </header>

      <Markdown>{thread.body}</Markdown>

      <Suspense fallback={<PublicComments thread={thread} />}>
        <ViewerComments thread={thread} />
      </Suspense>
    </article>
  );
}

function Banners({ thread }: { thread: ThreadDetail }) {
  const box = "rounded-lg border border-border bg-border/30 p-4";
  return (
    <>
      {(thread.status === "pending" || thread.status === "rejected") && (
        <div role="status" className={box}>
          <p className="font-semibold">{statusLabels[thread.status]}</p>
          <p className="text-muted">
            {thread.status === "pending"
              ? "Only you and the moderators can see this thread until it is approved."
              : "This thread is not public."}
          </p>
          {thread.status === "rejected" && thread.rejection_reason && (
            <p className="mt-2">Reason: {thread.rejection_reason}</p>
          )}
        </div>
      )}
      {thread.is_outdated && (
        <p role="status" className={box}>
          Information in this thread may be outdated.
        </p>
      )}
      {thread.status === "archived" && (
        <p role="status" className={box}>
          Archived — read-only.
        </p>
      )}
    </>
  );
}

async function ViewerActions({ thread }: { thread: ThreadDetail }) {
  const viewer = await getViewer();
  if (!viewer) return null;

  const isMod = isModerator(viewer.role);
  const canEdit = isMod || viewer.userId === thread.author_id;
  if (!canEdit) return null;

  return (
    <div className="flex flex-col gap-3">
      <p>
        <Link
          href={`/t/${thread.slug}/edit`}
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 font-medium hover:bg-border/40"
        >
          Edit
        </Link>
      </p>
      {isMod && (
        <ThreadModPanel
          thread={{
            id: thread.id,
            slug: thread.slug,
            status: thread.status,
            is_outdated: thread.is_outdated,
            is_pinned: thread.is_pinned,
          }}
        />
      )}
    </div>
  );
}
