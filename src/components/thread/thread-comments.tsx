import { CircleCheck, EyeOff, LogIn, MessageSquare } from "lucide-react";
import Link from "next/link";

import { Author, Avatar } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { CommentMenu } from "@/components/thread/comment-menu";
import { CommentSortControl } from "@/components/thread/comment-sort";
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
import { ReplyButton, ReplyColumn, ReplyScope } from "@/components/thread/reply-scope";
import { VoteControl } from "@/components/votes/vote-control";
import { CommentEditor, CommentEditScope } from "@/components/write/comment-editor";
import { CommentForm } from "@/components/write/comment-form";
import { getEffectiveViewer, isModerator, type Viewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/labels";

/** Viewer-independent comments, shown while the signed-in state streams in. */
export function PublicComments({ thread, sort }: { thread: ThreadDetail; sort: CommentSort }) {
  return <Comments thread={thread} viewer={null} sort={sort} votes={NO_VOTES} />;
}

/** Renders for the effective viewer: a moderator viewing as a member gets the member page. */
export async function ViewerComments({ thread, sort }: { thread: ThreadDetail; sort: CommentSort }) {
  const viewer = await getEffectiveViewer();
  const votes = viewer ? await getMyVotes(viewer.userId, thread.comments.map((c) => c.id)) : NO_VOTES;
  return <Comments thread={thread} viewer={viewer} sort={sort} votes={votes} />;
}

const NO_VOTES: ReadonlyMap<number, MyVote> = new Map();

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

/**
 * Top: highest score first, older first on ties. Newest: latest first. Replies stay chronological
 * under their parent; a group whose parent is hidden sorts by its first reply with no score.
 */
function sortGroups(groups: CommentGroup[], sort: CommentSort): CommentGroup[] {
  const time = (g: CommentGroup) => Date.parse((g.comment ?? g.replies[0]).created_at);
  const score = (g: CommentGroup) => g.comment?.score ?? 0;
  return [...groups].sort((a, b) =>
    sort === "new" ? time(b) - time(a) : score(b) - score(a) || time(a) - time(b),
  );
}

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
}: {
  thread: ThreadDetail;
  viewer: Viewer | null;
  sort: CommentSort;
  votes: ReadonlyMap<number, MyVote>;
}) {
  const isMod = viewer !== null && isModerator(viewer.role);
  // RLS still returns hidden comments to a moderator viewing as a member; members never see them.
  const comments = isMod ? thread.comments : thread.comments.filter((c) => c.hidden_at === null);
  const best = comments.find((c) => c.id === thread.best_comment_id);
  const groups = sortGroups(groupComments(comments), sort);
  const canComment = thread.status === "published";
  const ctx: ItemContext = { thread, viewer, isMod, canReply: canComment && viewer !== null, votes };
  const count = comments.length;

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="comments-heading" className="flex items-center gap-2 text-base font-semibold tracking-tight">
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-4 text-muted" />
          {count} {count === 1 ? "comment" : "comments"}
        </h2>
        {groups.length > 1 && <CommentSortControl slug={thread.slug} value={sort} />}
      </div>

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
    <div className={cn("flex", isReply ? "gap-2.5 py-3" : "gap-3 py-5")}>
      <Avatar
        name={comment.author?.display_name ?? null}
        className={isReply ? "mt-px size-6 text-[10px]" : "mt-px size-7 text-[11px]"}
      />
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", isHidden && "opacity-60")}>
        <div className="flex items-start gap-2">
          <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
            <Author profile={comment.author} avatar={false} />
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <span aria-hidden className="text-subtle">·</span>
              <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
              {comment.edited_at && <span className="text-subtle">edited</span>}
            </span>
            {isBest && !isBestCopy && (
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
          {!isBestCopy && (
            <CommentMenu
              threadId={thread.id}
              slug={thread.slug}
              commentId={comment.id}
              canReport={canReport}
              mod={isMod ? { isBest, isHidden } : null}
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
