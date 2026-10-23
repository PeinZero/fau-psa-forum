import { Archive, ChevronRight, CircleAlert, Clock, MapPin, Pin, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { Author } from "@/components/author";
import { getSavedState } from "@/components/bookmarks/data";
import { Markdown } from "@/components/markdown";
import { MemberViewBanner } from "@/components/member-view/member-view-banner";
import { ShareButton } from "@/components/share/share-button";
import { CommentsSkeleton, PublicComments, ViewerComments } from "@/components/thread/thread-comments";
import { getThread, parseCommentSort, plainTextExcerpt, type ThreadDetail } from "@/components/thread/thread-data";
import { ThreadMenu } from "@/components/thread/thread-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { needsVerificationHint, UnverifiedHint, VerifiedBadge } from "@/components/update-requests/verified";
import { getEffectiveViewer, isModerator } from "@/lib/auth/viewer";
import { cityLabels, formatDate, statusLabels } from "@/lib/labels";
import { siteUrl } from "@/lib/site-url";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ sort?: string | string[] }>;

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

export default function ThreadPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Suspense fallback={null}>
        <MemberViewBanner className="mb-6" />
      </Suspense>
      <Suspense fallback={<ThreadSkeleton />}>
        <ThreadContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ThreadContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, { sort: sortParam }] = await Promise.all([params, searchParams]);
  const thread = await getThread(slug);
  if (!thread) notFound();
  const sort = parseCommentSort(sortParam);

  return (
    <article className="flex flex-col">
      <Breadcrumbs thread={thread} />

      <header className="mt-4 flex flex-col gap-4">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.025em] break-words sm:text-[2.25rem] sm:leading-[1.15]">
          {thread.title}
        </h1>
        <ThreadBadges thread={thread} />
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-meta text-muted">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Author profile={thread.author} />
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span aria-hidden className="text-subtle">·</span>
              <time dateTime={thread.created_at}>{formatDate(thread.created_at)}</time>
            </span>
            {thread.edited_at && (
              <span className="text-subtle">
                edited <time dateTime={thread.edited_at}>{formatDate(thread.edited_at)}</time>
              </span>
            )}
          </p>
          <div className="flex items-center gap-1">
            {(thread.status === "published" || thread.status === "archived") && (
              <ShareButton url={`${siteUrl}/t/${thread.slug}`} title={thread.title} />
            )}
            <Suspense fallback={<ThreadMenu thread={modFields(thread)} slug={thread.slug} />}>
              <ViewerThreadMenu thread={thread} />
            </Suspense>
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-col gap-3 empty:hidden">
        <Banners thread={thread} />
      </div>

      <div className="mt-8 border-t border-border pt-8">
        <Markdown>{thread.body}</Markdown>
      </div>

      <div className="mt-12">
        <Suspense fallback={<PublicComments thread={thread} sort={sort} />}>
          <ViewerComments thread={thread} sort={sort} />
        </Suspense>
      </div>
    </article>
  );
}

function Breadcrumbs({ thread }: { thread: ThreadDetail }) {
  const crumb =
    "inline-flex items-center rounded-sm transition-colors hover:text-foreground pointer-coarse:min-h-11";
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
        <li className="shrink-0">
          <Link href="/" className={crumb}>
            Home
          </Link>
        </li>
        {thread.category && (
          <>
            <ChevronRight aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-subtle" />
            <li className="shrink-0">
              <Link href={`/c/${thread.category.slug}`} className={crumb}>
                {thread.category.name}
              </Link>
            </li>
          </>
        )}
        <ChevronRight aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0 text-subtle" />
        <li aria-current="page" className="min-w-0 truncate text-subtle">
          {thread.title}
        </li>
      </ol>
    </nav>
  );
}

function ThreadBadges({ thread }: { thread: ThreadDetail }) {
  const statusBadge = {
    pending: <Badge variant="warning">{statusLabels.pending}</Badge>,
    rejected: <Badge variant="danger">{statusLabels.rejected}</Badge>,
    archived: <Badge>{statusLabels.archived}</Badge>,
    published: null,
  }[thread.status];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {thread.is_pinned && (
        <Badge variant="accent">
          <Pin aria-hidden strokeWidth={1.75} />
          Pinned
        </Badge>
      )}
      {statusBadge}
      {thread.category && <Badge>{thread.category.name}</Badge>}
      {thread.city && (
        <Badge>
          <MapPin aria-hidden strokeWidth={1.75} />
          {cityLabels[thread.city]}
        </Badge>
      )}
      {thread.is_outdated && <Badge variant="warning">Outdated</Badge>}
      {thread.last_verified_at && <VerifiedBadge at={thread.last_verified_at} />}
      {!thread.is_outdated && needsVerificationHint(thread) && <UnverifiedHint />}
    </div>
  );
}

const calloutTones = {
  warning: "border-warning/25 bg-warning/[0.06] [&>svg]:text-warning",
  danger: "border-danger/25 bg-danger/[0.06] [&>svg]:text-danger",
  neutral: "border-border bg-surface [&>svg]:text-muted",
};

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: keyof typeof calloutTones;
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3 text-meta [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
        calloutTones[tone],
      )}
    >
      {icon}
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        {children && <div className="mt-0.5 text-muted">{children}</div>}
      </div>
    </div>
  );
}

function Banners({ thread }: { thread: ThreadDetail }) {
  return (
    <>
      {thread.status === "pending" && (
        <Callout tone="warning" icon={<Clock strokeWidth={1.75} />} title={statusLabels.pending}>
          Only you and the moderators can see this thread until it is approved.
        </Callout>
      )}
      {thread.status === "rejected" && (
        <Callout tone="danger" icon={<CircleAlert strokeWidth={1.75} />} title={statusLabels.rejected}>
          <p>This thread is not public.</p>
          {thread.rejection_reason && (
            <p className="mt-1 break-words">
              <span className="font-medium text-foreground">Reason:</span> {thread.rejection_reason}
            </p>
          )}
        </Callout>
      )}
      {thread.is_outdated && (
        <Callout tone="warning" icon={<TriangleAlert strokeWidth={1.75} />} title="Marked as outdated">
          A moderator flagged that parts of this thread may no longer be correct. Check the newest comments for
          updates, and confirm with the official office before you rely on it.
        </Callout>
      )}
      {thread.status === "archived" && (
        <Callout tone="neutral" icon={<Archive strokeWidth={1.75} />} title="Archived">
          This thread is read-only and no longer listed.
        </Callout>
      )}
    </>
  );
}

function modFields({ id, status, is_outdated, is_pinned }: ThreadDetail) {
  return { id, status, is_outdated, is_pinned };
}

async function ViewerThreadMenu({ thread }: { thread: ThreadDetail }) {
  const viewer = await getEffectiveViewer();
  const isMod = viewer !== null && isModerator(viewer.role);
  const isAuthor = viewer !== null && viewer.userId === thread.author_id;
  const isPublic = thread.status === "published" || thread.status === "archived";
  const saved = viewer ? await getSavedState(viewer.userId, thread.id) : undefined;

  return (
    <ThreadMenu
      thread={modFields(thread)}
      slug={thread.slug}
      saved={saved}
      canEdit={isMod || isAuthor}
      canReport={viewer !== null && !isMod && !isAuthor && isPublic}
      canRequestUpdate={viewer !== null && !isMod && thread.status === "published"}
      isMod={isMod}
    />
  );
}

function ThreadSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading thread…</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-5 h-8 w-11/12" />
      <Skeleton className="mt-2 h-8 w-2/3" />
      <div className="mt-5 flex gap-1.5">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-5 flex items-center gap-2">
        <Skeleton className="size-6 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="mt-8 flex flex-col gap-3 border-t border-border pt-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-12">
        <CommentsSkeleton />
      </div>
    </div>
  );
}
