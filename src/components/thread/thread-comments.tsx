import Link from "next/link";

import { Author } from "@/components/author";
import { CommentForm } from "@/components/write/comment-form";
import { CommentEditor } from "@/components/write/comment-editor";
import { CommentModActions } from "@/components/mod/comment-mod-actions";
import { Markdown } from "@/components/markdown";
import type { CommentDetail, ThreadDetail } from "@/components/thread/thread-data";
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

function Comments({ thread, viewer }: { thread: ThreadDetail; viewer: Viewer | null }) {
  const best = thread.comments.find((c) => c.id === thread.best_comment_id);
  const rest = thread.comments.filter((c) => c.id !== best?.id);
  const isMod = viewer !== null && isModerator(viewer.role);
  const canComment = thread.status === "published";

  const renderComment = (comment: CommentDetail, isBest: boolean) => (
    <CommentItem
      key={comment.id}
      comment={comment}
      thread={thread}
      viewer={viewer}
      isMod={isMod}
      isBest={isBest}
    />
  );

  return (
    <section aria-labelledby="comments-heading" className="flex flex-col gap-4">
      <h2 id="comments-heading" className="text-xl font-semibold">
        {thread.comments.length} {thread.comments.length === 1 ? "comment" : "comments"}
      </h2>

      {thread.comments.length > 0 && (
        <ul className="flex flex-col gap-4">
          {best && renderComment(best, true)}
          {rest.map((comment) => renderComment(comment, false))}
        </ul>
      )}

      {canComment &&
        (viewer ? (
          <CommentForm threadId={thread.id} />
        ) : (
          <p>
            <Link
              href={`/login?next=/t/${thread.slug}`}
              className="inline-flex min-h-11 items-center text-accent underline"
            >
              Sign in to comment
            </Link>
          </p>
        ))}
    </section>
  );
}

function CommentItem({
  comment,
  thread,
  viewer,
  isMod,
  isBest,
}: {
  comment: CommentDetail;
  thread: ThreadDetail;
  viewer: Viewer | null;
  isMod: boolean;
  isBest: boolean;
}) {
  const isHidden = comment.hidden_at !== null;
  const isOwn = viewer !== null && viewer.userId === comment.author_id;

  return (
    <li
      id={`comment-${comment.id}`}
      className={`flex flex-col gap-2 rounded-lg border p-4 ${
        isBest ? "border-accent" : "border-border"
      } ${isHidden ? "opacity-60" : ""}`}
    >
      {isBest && <p className="text-sm font-semibold text-accent">Best answer</p>}
      {isHidden && <p className="text-sm font-medium text-muted">Hidden by a moderator</p>}
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <Author profile={comment.author} />
        <span aria-hidden="true">·</span>
        <time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>
        {comment.edited_at && <span>(edited)</span>}
      </p>
      {isOwn && thread.status === "published" ? (
        <CommentEditor commentId={comment.id} body={comment.body} />
      ) : (
        <Markdown>{comment.body}</Markdown>
      )}
      {isMod && (
        <CommentModActions
          threadId={thread.id}
          commentId={comment.id}
          isBest={isBest}
          isHidden={isHidden}
        />
      )}
    </li>
  );
}
