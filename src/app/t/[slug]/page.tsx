import { Archive, ChevronRight, CircleAlert, CircleCheck, Clock, MapPin, MessageSquare, Pin, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { Author, Avatar } from "@/components/author";
import { getSavedState } from "@/components/bookmarks/data";
import { getCannedReplies } from "@/components/mod/canned-replies";
import { Markdown } from "@/components/markdown";
import { MemberViewBanner } from "@/components/member-view/member-view-banner";
import { ShareButton } from "@/components/share/share-button";
import { CommunitySidebarSkeleton } from "@/components/sidebar/community-sidebar";
import { FeedLayout } from "@/components/sidebar/feed-layout";
import { ThreadSidebar } from "@/components/sidebar/thread-sidebar";
import { CommentsSkeleton, PublicComments, ViewerComments } from "@/components/thread/thread-comments";
import {
  getMyThreadVote,
  getThread,
  type MyVote,
  parseCommentSort,
  plainTextExcerpt,
  type ThreadDetail,
} from "@/components/thread/thread-data";
import { metaFrame, metaItem, metaLine } from "@/components/thread/meta";
import { ThreadImages } from "@/components/thread/thread-images";
import { ThreadMenu } from "@/components/thread/thread-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { StaleThreadHint } from "@/components/update-requests/stale-hint";
import { VerifiedBadge } from "@/components/update-requests/verified";
import { ThreadVoteControl } from "@/components/votes/thread-vote-control";
import { getEffectiveViewer, isModerator } from "@/lib/auth/viewer";
import { cityLabels, formatDate, statusLabels } from "@/lib/labels";
import { siteUrl } from "@/lib/site-url";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ sort?: string | string[] }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const thread = await getThread(slug);
  // notFound() fires inside the streamed boundary, so the 404 page needs its own title here.
  if (!thread) return { title: "Thread not found", robots: { index: false, follow: false } };

  const description = plainTextExcerpt(thread.body);
  return {
    title: thread.title,
    description,
    openGraph: {
      type: "article",
      siteName: "PSA FAU Community Forum",
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
    <div>
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
    <FeedLayout
      sidebarLabel="More from the forum"
      sidebar={
        <Suspense fallback={<CommunitySidebarSkeleton />}>
          <ThreadSidebar thread={thread} />
        </Suspense>
      }
    >
      <article className="flex max-w-[45rem] flex-col">
        <Breadcrumbs thread={thread} />

        <header className="mt-4">
          <h1 className="text-display font-semibold tracking-[-0.02em] break-words text-foreground">{thread.title}</h1>
          <Byline thread={thread} />
          <ThreadBadges thread={thread} />
          <div className="mt-5 flex min-w-0 items-center gap-1.5 sm:gap-2">
            {isPublic(thread) && (
              <>
                <Suspense fallback={<ThreadVote thread={thread} viewerId={null} myVote={0} />}>
                  <ViewerThreadVote thread={thread} />
                </Suspense>
                <a
                  href="#comments-heading"
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-3.5 text-meta font-medium tabular-nums text-muted transition-colors duration-150 ease-out hover:bg-surface-hover hover:text-foreground active:bg-surface-hover/70 pointer-coarse:h-11"
                >
                  <MessageSquare aria-hidden strokeWidth={1.75} className="size-4" />
                  {thread.comment_count > 0 ? (
                    <>
                      {thread.comment_count}
                      <span className="max-[399px]:sr-only">{thread.comment_count === 1 ? "comment" : "comments"}</span>
                    </>
                  ) : (
                    // A new thread invites the first comment instead of announcing zero.
                    <span className="max-[399px]:sr-only">Comment</span>
                  )}
                </a>
              </>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
              {isPublic(thread) && <ShareButton url={`${siteUrl}/t/${thread.slug}`} title={thread.title} />}
              <Suspense fallback={<ThreadMenu thread={modFields(thread)} slug={thread.slug} />}>
                <ViewerThreadMenu thread={thread} />
              </Suspense>
            </div>
          </div>
        </header>

        <div className="mt-6 flex flex-col gap-3 empty:hidden">
          <Banners thread={thread} />
        </div>

        <div className="mt-6 border-t border-border pt-6 sm:pt-8">
          <Markdown size="reading">{thread.body}</Markdown>
          <ThreadImages images={[...thread.images].sort((a, b) => a.id - b.id)} />
        </div>

        <div className="mt-12 sm:mt-14">
          <Suspense fallback={<PublicComments thread={thread} sort={sort} />}>
            <ViewerComments thread={thread} sort={sort} />
          </Suspense>
        </div>
      </article>
    </FeedLayout>
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

/**
 * Author on the first line, when and where on the second. The second line's separators sit
 * before each item and are clipped at the line start, so a wrapped line never begins with "·".
 */
function Byline({ thread }: { thread: ThreadDetail }) {
  const item = cn(metaItem, "whitespace-nowrap");
  return (
    <div className="mt-4 flex items-center gap-3">
      <Avatar name={thread.author?.display_name ?? null} className="size-9 text-xs" />
      <div className="min-w-0 text-meta text-muted">
        <Author profile={thread.author} avatar={false} />
        <div className={metaFrame}>
          <p className={metaLine}>
            <span className={item}>
              <time dateTime={thread.created_at}>
                {formatDate(thread.created_at)}
              </time>
            </span>
            {thread.edited_at && (
              <span className={item}>
                edited <time dateTime={thread.edited_at}>{formatDate(thread.edited_at)}</time>
              </span>
            )}
            {thread.city && (
              <span className={cn(item, "gap-1")}>
                <MapPin aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
                {cityLabels[thread.city]}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
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
    <div className="mt-4 flex flex-wrap items-center gap-1.5 empty:hidden">
      {thread.is_pinned && (
        <Badge variant="accent">
          <Pin aria-hidden strokeWidth={1.75} />
          Pinned
        </Badge>
      )}
      {statusBadge}
      {thread.best_comment_id !== null && (
        <Badge variant="accent">
          <CircleCheck aria-hidden strokeWidth={1.75} />
          Answered
        </Badge>
      )}
      {thread.is_outdated && <Badge variant="warning">Outdated</Badge>}
      {thread.last_verified_at && <VerifiedBadge at={thread.last_verified_at} />}
      {!thread.is_outdated && <StaleThreadHint thread={thread} />}
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
        <Suspense fallback={<PendingCallout isAuthor={false} />}>
          <ViewerPendingCallout thread={thread} />
        </Suspense>
      )}
      {thread.status === "rejected" && (
        <Callout tone="danger" icon={<CircleAlert strokeWidth={1.75} />} title={statusLabels.rejected}>
          <p>This thread is not public. Rejected threads are deleted 7 days after the rejection or the author&apos;s last edit, unless a moderator approves them.</p>
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

function PendingCallout({ isAuthor }: { isAuthor: boolean }) {
  return (
    <Callout tone="warning" icon={<Clock strokeWidth={1.75} />} title={statusLabels.pending}>
      {isAuthor ? (
        <>
          Waiting for review — usually within a day. You&apos;ll get a bell notification when it&apos;s approved.{" "}
          <Link href="/me/threads" className="font-medium text-accent underline-offset-2 hover:underline">
            See your threads
          </Link>
        </>
      ) : (
        "Only the author and the moderators can see this thread until it is approved."
      )}
    </Callout>
  );
}

async function ViewerPendingCallout({ thread }: { thread: ThreadDetail }) {
  const viewer = await getEffectiveViewer();
  return <PendingCallout isAuthor={viewer !== null && viewer.userId === thread.author_id} />;
}

function isPublic(thread: ThreadDetail): boolean {
  return thread.status === "published" || thread.status === "archived";
}

function ThreadVote({ thread, viewerId, myVote }: { thread: ThreadDetail; viewerId: string | null; myVote: MyVote }) {
  const isAuthor = viewerId !== null && viewerId === thread.author_id;
  const archived = thread.status === "archived";
  return (
    <ThreadVoteControl
      threadId={thread.id}
      score={thread.score}
      myVote={myVote}
      signedIn={viewerId !== null}
      disabled={isAuthor || archived}
      disabledTitle={isAuthor ? "You can't vote on your own thread" : "Voting is closed on archived threads"}
    />
  );
}

async function ViewerThreadVote({ thread }: { thread: ThreadDetail }) {
  const viewer = await getEffectiveViewer();
  const myVote = viewer ? await getMyThreadVote(viewer.userId, thread.id) : 0;
  return <ThreadVote thread={thread} viewerId={viewer?.userId ?? null} myVote={myVote} />;
}

function modFields({ id, status, is_outdated, is_pinned }: ThreadDetail) {
  return { id, status, is_outdated, is_pinned };
}

async function ViewerThreadMenu({ thread }: { thread: ThreadDetail }) {
  const viewer = await getEffectiveViewer();
  const isMod = viewer !== null && isModerator(viewer.role);
  const isAuthor = viewer !== null && viewer.userId === thread.author_id;
  const isPublic = thread.status === "published" || thread.status === "archived";
  const [saved, presets] = await Promise.all([
    viewer ? getSavedState(viewer.userId, thread.id) : undefined,
    isMod && thread.status === "pending" ? getCannedReplies() : undefined,
  ]);
  const canMuteAuthor = isMod && !isAuthor && thread.author_id !== null && thread.author?.role === "member";

  return (
    <ThreadMenu
      thread={modFields(thread)}
      slug={thread.slug}
      saved={saved}
      canEdit={isAuthor}
      canDelete={isAuthor}
      canMove={isMod && !isAuthor}
      canReport={viewer !== null && !isMod && !isAuthor && isPublic}
      canRequestUpdate={viewer !== null && !isMod && thread.status === "published"}
      isMod={isMod}
      presets={presets}
      author={canMuteAuthor && thread.author_id && thread.author ? { id: thread.author_id, name: thread.author.display_name } : null}
    />
  );
}

function ThreadSkeleton() {
  return (
    <FeedLayout sidebar={<CommunitySidebarSkeleton />}>
      <div role="status" aria-busy="true" className="max-w-[45rem]">
        <span className="sr-only">Loading thread…</span>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-5 h-8 w-11/12" />
        <Skeleton className="mt-2 h-8 w-2/3" />
        <div className="mt-4 flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-full pointer-coarse:h-11" />
          <Skeleton className="h-9 w-28 rounded-full pointer-coarse:h-11" />
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:pt-8">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="mt-12 sm:mt-14">
          <CommentsSkeleton />
        </div>
      </div>
    </FeedLayout>
  );
}
