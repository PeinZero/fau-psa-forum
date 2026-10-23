import { CircleCheck, EyeOff, LogIn, MessageSquare } from "lucide-react";
import Link from "next/link";

import { Author, Avatar } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { CommentModActions } from "@/components/mod/comment-mod-actions";
import { ReportButton } from "@/components/report/report-button";
import type { CommentDetail, ThreadDetail } from "@/components/thread/thread-data";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentAnchor, ReplyList } from "@/components/thread/reply-list";
import { ReplyButton, ReplyColumn, ReplyScope } from "@/components/thread/reply-scope";
import { CommentEditor } from "@/components/write/comment-editor";
import { CommentForm } from "@/components/write/comment-form";
import { getViewer, isModerator, type Viewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/labels";

/** Viewer-independent comments, shown while the signed-in state streams in. */
export function PublicComments({ thread }: { thread: ThreadDetail }) {
  return <Comments thread={thread} viewer={null} />;
}

export async function ViewerComments({ thread }: { thread: ThreadDetail }) {
  const viewer = await getViewer();
  return <Comments thread={thread} viewer={viewer} />;
}

type CommentGroup = { id: number; comment: CommentDetail | null; replies: CommentDetail[] };

/**
 * Top-level comments with their replies, in the order the comments arrive (chronological).
 * A parent is always older than its replies; replies of a parent the viewer cannot see (hidden by
 * a moderator) stay visible as a group of their own.
 */
function groupComments(comments: CommentDetail[]): CommentGroup[] {
  const groups = new Map<number, CommentGroup>();
  for (const comment of comments) {
    const id = comment.parent_id ?? comment.id;
    const group = groups.get(id) ?? { id, comment: null, replies: [] };
    groups.set(id, group);
    if (comment.parent_id === null) group.comment = comment;
    else group.replies.push(comment);
  }
  return [...groups.values()];
}

type ItemContext = { thread: ThreadDetail; viewer: Viewer | null; isMod: boolean; canReply: boolean };

function Comments({ thread, viewer }: { thread: ThreadDetail; viewer: Viewer | null }) {
  const best = thread.comments.find((c) => c.id === thread.best_comment_id);
  const groups = groupComments(thread.comments);
  const isMod = viewer !== null && isModerator(viewer.role);
  const canComment = thread.status === "published";
  const ctx: ItemContext = { thread, viewer, isMod, canReply: canComment && viewer !== null };
  const count = thread.comments.length;

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-5">
      <h2 id="comments-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight">
        <MessageSquare aria-hidden strokeWidth={1.75} className="size-4 text-muted" />
        {count} {count === 1 ? "comment" : "comments"}
      </h2>

      {best && (
        <div className="overflow-hidden rounded-xl border border-accent/40 bg-accent-soft shadow-[0_0_0_3px_var(--accent-soft)]">
          <div className="flex items-center gap-1.5 border-b border-accent/20 px-4 py-2 text-meta font-medium text-accent sm:px-5">
            <CircleCheck aria-hidden strokeWidth={2} className="size-4" />
            Best answer
            <a
              href={`#comment-${best.id}`}
              className="-my-1 ml-auto inline-flex items-center rounded-sm text-accent/80 transition-colors hover:text-accent pointer-coarse:min-h-11"
            >
              View in thread
            </a>
          </div>
          <div className="bg-background/60 px-4 sm:px-5">
            <CommentItem comment={best} ctx={{ ...ctx, canReply: false }} variant="best" />
          </div>
        </div>
      )}

      {groups.length > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {groups.map((group, i) => (
            <li key={group.id} style={stagger(i)} className="animate-fade-up">
              <Group group={group} ctx={ctx} />
            </li>
          ))}
        </ul>
      )}

      {count === 0 && canComment && (
        <p className="text-meta text-muted">No answers yet. Share what you know.</p>
      )}

      {canComment &&
        (viewer ? (
          <div className={cardClasses()}>
            <CommentForm threadId={thread.id} />
          </div>
        ) : (
          <div className={cardClasses({ className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" })}>
            <div>
              <p className="text-sm font-medium text-foreground">Know the answer?</p>
              <p className="text-meta text-muted">Sign in to comment and help the next student.</p>
            </div>
            <Link
              href={`/login?next=/t/${thread.slug}`}
              className={buttonClasses({ variant: "secondary", size: "sm", className: "self-start sm:self-auto" })}
            >
              <LogIn strokeWidth={1.75} />
              Sign in to comment
            </Link>
          </div>
        ))}
    </section>
  );
}

function Group({ group, ctx }: { group: CommentGroup; ctx: ItemContext }) {
  const top = group.comment ? (
    <CommentAnchor commentId={group.comment.id}>
      <CommentItem comment={group.comment} ctx={ctx} variant="top" />
    </CommentAnchor>
  ) : (
    <p className="flex items-center gap-3 py-5 text-meta text-subtle">
      <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border">
        <EyeOff strokeWidth={1.75} className="size-3.5" />
      </span>
      This comment was hidden by a moderator.
    </p>
  );
  const replies =
    group.replies.length > 0 ? (
      <ReplyList
        replies={group.replies.map((reply) => ({
          id: reply.id,
          node: <CommentItem comment={reply} ctx={ctx} variant="reply" />,
        }))}
      />
    ) : null;

  // Nobody can reply under a parent they cannot see.
  if (!ctx.canReply || !group.comment) {
    return (
      <>
        {top}
        {replies && <ReplyColumn>{replies}</ReplyColumn>}
      </>
    );
  }
  return (
    <ReplyScope threadId={ctx.thread.id} parentId={group.id} replies={replies}>
      {top}
    </ReplyScope>
  );
}

function CommentItem({
  comment,
  ctx: { thread, viewer, isMod, canReply },
  variant,
}: {
  comment: CommentDetail;
  ctx: ItemContext;
  variant: "top" | "reply" | "best";
}) {
  const isHidden = comment.hidden_at !== null;
  const isBest = comment.id === thread.best_comment_id;
  const isOwn = viewer !== null && viewer.userId === comment.author_id;
  const isPublic = thread.status === "published" || thread.status === "archived";
  const canReport = viewer !== null && !isMod && !isOwn && !isHidden && isPublic;
  const mention = comment.author && !isOwn ? comment.author.username : null;
  const isReply = variant === "reply";
  const isBestCopy = variant === "best";

  return (
    <div className={cn("flex", isReply ? "gap-2.5 py-3" : "gap-3 py-5")}>
      <Avatar
        name={comment.author?.display_name ?? null}
        className={isReply ? "mt-px size-6 text-[10px]" : "mt-px size-7 text-[11px]"}
      />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", isHidden && "opacity-60")}>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
          <Author profile={comment.author} avatar={false} />
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span aria-hidden className="text-subtle">·</span>
            <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
            {comment.edited_at && <span className="text-subtle">edited</span>}
          </span>
          {isBest && variant !== "best" && (
            <Badge variant="accent">
              <CircleCheck aria-hidden strokeWidth={1.75} />
              Best answer
            </Badge>
          )}
          {isHidden && (
            <Badge>
              <EyeOff aria-hidden strokeWidth={1.75} />
              Hidden by a moderator
            </Badge>
          )}
        </p>
        {isOwn && thread.status === "published" && !isBestCopy ? (
          <CommentEditor commentId={comment.id} body={comment.body} />
        ) : (
          <Markdown>{comment.body}</Markdown>
        )}
        {!isBestCopy && (canReply || isMod || canReport) && (
          <div className="-ml-3 flex flex-wrap items-center gap-1 text-meta">
            {canReply && <ReplyButton mention={mention} />}
            {canReport && <ReportButton target={{ commentId: comment.id }} />}
            {isMod && (
              <CommentModActions threadId={thread.id} commentId={comment.id} isBest={isBest} isHidden={isHidden} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-5">
      <Skeleton className="h-5 w-28" />
      <div className="flex flex-col divide-y divide-border">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3 py-5">
            <Skeleton className="size-7 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
