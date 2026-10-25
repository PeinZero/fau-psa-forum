import { CircleCheck, EyeOff, LogIn } from "lucide-react";
import Link from "next/link";

import { Author, Avatar } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { getOwnRestriction } from "@/components/restrictions/data";
import { RestrictionBanner } from "@/components/restrictions/restriction-banner";
import { CommentMenu } from "@/components/thread/comment-menu";
import { CommentSortControl } from "@/components/thread/comment-sort";
import { type CommentGroup, groupComments, sortGroups } from "@/components/thread/comment-groups";
import {
  type CommentDetail,
  type CommentSort,
  getMyVotes,
  type MyVote,
  type ThreadDetail,
} from "@/components/thread/thread-data";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentAnchor, ReplyList } from "@/components/thread/reply-list";
import { metaFrame, metaItem, metaLine, metaPlainItem } from "@/components/thread/meta";
import { ReplyButton, ReplyColumn, ReplyScope } from "@/components/thread/reply-scope";
import { VoteControl } from "@/components/votes/vote-control";
import { CommentEditor, CommentEditScope } from "@/components/write/comment-editor";
import { CommentForm } from "@/components/write/comment-form";
import { getEffectiveViewer, isModerator, type Viewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/labels";
import type { Restriction } from "@/lib/restrictions";

/** Viewer-independent comments, shown while the signed-in state streams in. */
export function PublicComments({ thread, sort }: { thread: ThreadDetail; sort: CommentSort }) {
  return <Comments thread={thread} viewer={null} sort={sort} votes={NO_VOTES} restriction={null} />;
}

/** Renders for the effective viewer: a moderator viewing as a member gets the member page. */
export async function ViewerComments({ thread, sort }: { thread: ThreadDetail; sort: CommentSort }) {
  const viewer = await getEffectiveViewer();
  const [votes, restriction] = viewer
    ? await Promise.all([getMyVotes(viewer.userId, thread.comments.map((c) => c.id)), getOwnRestriction(viewer.userId)])
    : [NO_VOTES, null];
  return <Comments thread={thread} viewer={viewer} sort={sort} votes={votes} restriction={restriction} />;
}

const NO_VOTES: ReadonlyMap<number, MyVote> = new Map();

type ItemContext = {
  thread: ThreadDetail;
  viewer: Viewer | null;
  isMod: boolean;
  canReply: boolean;
  votes: ReadonlyMap<number, MyVote>;
};

function Comments({
  thread,
  viewer,
  sort,
  votes,
  restriction,
}: {
  thread: ThreadDetail;
  viewer: Viewer | null;
  sort: CommentSort;
  votes: ReadonlyMap<number, MyVote>;
  /** The viewer's mute or ban, which replaces the comment form with an explanation. */
  restriction: Restriction | null;
}) {
  const isMod = viewer !== null && isModerator(viewer.role);
  // RLS still returns hidden comments to a moderator viewing as a member; members never see them.
  const comments = isMod ? thread.comments : thread.comments.filter((c) => c.hidden_at === null);
  const best = comments.find((c) => c.id === thread.best_comment_id);
  const groups = sortGroups(groupComments(comments), sort);
  const canComment = thread.status === "published";
  const ctx: ItemContext = { thread, viewer, isMod, canReply: canComment && viewer !== null && restriction === null, votes };
  const count = comments.length;

  return (
    <section aria-labelledby="comments-heading" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <h2 id="comments-heading" className="flex items-baseline gap-2 text-heading font-semibold text-foreground">
          Comments
          {count > 0 && <span className="text-body font-medium tabular-nums text-muted">{count}</span>}
        </h2>
        {groups.length > 1 && <CommentSortControl slug={thread.slug} value={sort} />}
      </div>

      {best && (
        <div className="rounded-xl bg-accent-soft px-4 pt-3 ring-1 ring-accent/20 ring-inset sm:px-5">
          <div className="flex items-center gap-1.5 text-meta font-medium text-accent">
            <CircleCheck aria-hidden strokeWidth={2} className="size-4" />
            Best answer
            <a
              href={`#comment-${best.id}`}
              className="ml-auto inline-flex items-center rounded-sm text-accent/80 underline-offset-2 transition-colors duration-150 hover:text-accent hover:underline pointer-coarse:min-h-11"
            >
              View in thread
            </a>
          </div>
          <CommentItem comment={best} ctx={{ ...ctx, canReply: false }} variant="best" />
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
        <p className="text-body text-muted">No comments yet. If you know something that helps, share it here.</p>
      )}

      {canComment &&
        (restriction ? (
          <RestrictionBanner restriction={restriction} />
        ) : viewer ? (
          <div className={cn(count > 0 && "border-t border-border pt-5")}>
            <CommentForm threadId={thread.id} />
          </div>
        ) : (
          <div className={cardClasses({ variant: "quiet", className: "mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" })}>
            <div>
              <p className="text-body font-semibold text-foreground">Know the answer?</p>
              <p className="mt-0.5 text-meta text-muted">Sign in to comment and help the next student.</p>
            </div>
            <Link
              href={`/login?next=/t/${thread.slug}`}
              className={buttonClasses({ size: "sm", className: "self-start sm:self-auto" })}
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
  ctx: { thread, viewer, isMod, canReply, votes },
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
  // The pinned copy repeats the comment for reading; its controls live on the original below.
  const isBestCopy = variant === "best";
  const canEdit = isOwn && !isHidden && thread.status === "published" && !isBestCopy;

  const item = (
    <div className={cn("flex", isReply ? "gap-2.5 py-3" : isBestCopy ? "gap-3 pt-3 pb-4" : "gap-3 py-5")}>
      <Avatar
        name={comment.author?.display_name ?? null}
        className={isReply ? "mt-px size-6 text-[10px]" : "mt-px size-7 text-[11px]"}
      />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", isHidden && "opacity-60")}>
        <div className="flex items-start gap-2">
          <div className={cn(metaFrame, "flex-1 text-meta text-muted")}>
            <p className={metaLine}>
              <span className="inline-flex min-w-0 pl-4">
                <Author profile={comment.author} avatar={false} />
              </span>
              <span className={cn(metaItem, "gap-1.5 whitespace-nowrap")}>
                <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
                {comment.edited_at && <span className="text-subtle">edited</span>}
              </span>
              {isBest && !isBestCopy && (
                <span className={metaPlainItem}>
                  <Badge variant="accent">
                    <CircleCheck aria-hidden strokeWidth={1.75} />
                    Best answer
                  </Badge>
                </span>
              )}
              {isHidden && (
                <span className={metaPlainItem}>
                  <Badge>
                    <EyeOff aria-hidden strokeWidth={1.75} />
                    Hidden by a moderator
                  </Badge>
                </span>
              )}
            </p>
          </div>
          {!isBestCopy && (
            <CommentMenu
              threadId={thread.id}
              slug={thread.slug}
              commentId={comment.id}
              canReport={canReport}
              mod={isMod ? { isBest, isHidden, author: isOwn ? null : mutableAuthor(comment) } : null}
            />
          )}
        </div>
        {canEdit ? <CommentEditor commentId={comment.id} body={comment.body} /> : <Markdown>{comment.body}</Markdown>}
        {!isBestCopy && (
          <div className="-ml-1.5 flex flex-wrap items-center gap-1 text-meta">
            <VoteControl
              commentId={comment.id}
              score={comment.score}
              myVote={votes.get(comment.id) ?? 0}
              signedIn={viewer !== null}
              disabled={isOwn || isHidden || thread.status !== "published"}
            />
            {canReply && <ReplyButton mention={mention} />}
          </div>
        )}
      </div>
    </div>
  );

  return canEdit ? <CommentEditScope>{item}</CommentEditScope> : item;
}

/** Moderators mute members from the menu; staff accounts are restricted by the superadmin on /mod/users. */
function mutableAuthor(comment: CommentDetail) {
  if (!comment.author_id || comment.author?.role !== "member") return null;
  return { id: comment.author_id, name: comment.author.display_name };
}

export function CommentsSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="flex min-h-9 items-center">
        <Skeleton className="h-5 w-28" />
      </div>
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
