import { CircleCheck, LogIn, MoreHorizontal, Reply } from "lucide-react";

import { AuthorName, Avatar } from "../../ui/avatar";
import { StatusPill } from "../../ui/badge";
import { buttonClasses } from "../../ui/button";
import { cardClasses } from "../../ui/card";
import { cn } from "../../ui/cn";
import { Kbd } from "../../ui/kbd";
import { SegmentedControl } from "../../ui/segmented-control";
import { VoteControl } from "../../ui/vote-control";
import type { DemoComment, DemoUser } from "../demo-data";
import { Markdown } from "./markdown";

const metaFrame = "min-w-0 overflow-hidden";
const metaLine = "-ml-4 flex flex-wrap items-center gap-y-1";
const metaItem =
  "relative inline-flex items-center pl-4 before:absolute before:left-1.5 before:text-subtle before:content-['·']";
const metaPlainItem = "inline-flex items-center pl-2";

export type CommentsViewer = { signedIn: boolean; user: DemoUser | null };

/**
 * The comments section of a thread page (src/components/thread/thread-comments.tsx): heading with
 * a muted count, the best answer pinned on top in its soft emerald panel, the hairline list, then
 * the comment form (members) or the sign-in card (visitors). Pending threads show only the heading.
 */
export function CommentsSection({
  comments,
  bestAnswerId,
  canComment,
  viewer,
  device = "desktop",
}: {
  comments: DemoComment[];
  /** The comment pinned as best answer; null shows no panel. */
  bestAnswerId: number | null;
  /** Published threads take comments; pending ones don't. */
  canComment: boolean;
  viewer: CommentsViewer;
  device?: "desktop" | "phone";
}) {
  const best = comments.find((c) => c.id === bestAnswerId);
  const count = comments.length;
  const touch = device === "phone";
  return (
    <section className="flex flex-col gap-4">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <h2 data-anchor="comments" className="flex items-baseline gap-2 text-heading font-semibold text-foreground">
          Comments
          {count > 0 && <span className="text-body font-medium text-muted tabular-nums">{count}</span>}
        </h2>
        {count > 1 && (
          <SegmentedControl
            value="top"
            touch={touch}
            options={[
              { value: "top", label: "Top" },
              { value: "new", label: "Newest" },
            ]}
          />
        )}
      </div>

      {best && (
        <div data-anchor="best-answer" className={cn("rounded-xl bg-accent-soft pt-3 ring-1 ring-accent/20 ring-inset", touch ? "px-4" : "px-5")}>
          <div className="flex items-center gap-1.5 text-meta font-medium text-accent">
            <CircleCheck aria-hidden strokeWidth={2} className="size-4" />
            Best answer
            <span className="ml-auto inline-flex items-center rounded-sm text-accent/80">View in thread</span>
          </div>
          <CommentItem comment={best} variant="best" isBest viewer={viewer} canReply={false} touch={touch} />
        </div>
      )}

      {count > 0 && (
        <ul className="flex flex-col divide-y divide-border">
          {comments.map((comment) => (
            <li key={comment.id}>
              <CommentItem
                comment={comment}
                variant="top"
                isBest={comment.id === bestAnswerId}
                viewer={viewer}
                canReply={canComment && viewer.signedIn}
                touch={touch}
              />
            </li>
          ))}
        </ul>
      )}

      {count === 0 && canComment && (
        <p className="text-body text-muted">No comments yet. If you know something that helps, share it here.</p>
      )}

      {canComment &&
        (viewer.signedIn ? (
          <div className={cn(count > 0 && "border-t border-border pt-5")}>
            <CommentFormStatic />
          </div>
        ) : (
          <div
            className={cardClasses({
              variant: "quiet",
              className: cn("mt-2 flex gap-4", touch ? "flex-col p-4" : "flex-row items-center justify-between"),
            })}
          >
            <div>
              <p className="text-body font-semibold text-foreground">Know the answer?</p>
              <p className="mt-0.5 text-meta text-muted">Sign in to comment and help the next student.</p>
            </div>
            <span className={buttonClasses({ size: "sm", touch, className: touch ? "self-start" : undefined })}>
              <LogIn strokeWidth={1.75} />
              Sign in to comment
            </span>
          </div>
        ))}
    </section>
  );
}

function CommentItem({
  comment,
  variant,
  isBest,
  viewer,
  canReply,
  touch,
}: {
  comment: DemoComment;
  variant: "top" | "best";
  isBest: boolean;
  viewer: CommentsViewer;
  canReply: boolean;
  touch: boolean;
}) {
  // The pinned copy repeats the comment for reading; its controls live on the original below.
  const isCopy = variant === "best";
  const isOwn = viewer.user !== null && viewer.user.username === comment.author.username;
  return (
    <div className={cn("flex", isCopy ? "gap-3 pt-3 pb-4" : "gap-3 py-5")}>
      <Avatar name={comment.author.displayName} className="mt-px size-7 text-[11px]" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start gap-2">
          <div className={cn(metaFrame, "flex-1 text-meta text-muted")}>
            <p className={metaLine}>
              <span className="inline-flex min-w-0 pl-4">
                <AuthorName name={comment.author.displayName} role={comment.author.role} affiliation={comment.author.affiliation} />
              </span>
              <span className={cn(metaItem, "gap-1.5 whitespace-nowrap")}>
                <time>{comment.date}</time>
              </span>
              {isBest && !isCopy && (
                <span className={metaPlainItem}>
                  <StatusPill kind="best-answer" />
                </span>
              )}
            </p>
          </div>
          {!isCopy && (
            <div className="-my-1.5 -mr-2 ml-auto flex shrink-0 items-center gap-1">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-md text-subtle [&_svg]:size-4",
                  touch ? "size-11" : "size-8",
                )}
              >
                <MoreHorizontal aria-hidden strokeWidth={1.75} />
              </span>
            </div>
          )}
        </div>
        <Markdown blocks={comment.body} />
        {!isCopy && (
          <div className="-ml-1.5 flex flex-wrap items-center gap-1 text-meta">
            <VoteControl score={comment.score} disabled={isOwn} touch={touch} />
            {canReply && (
              <span className={buttonClasses({ variant: "ghost", size: "sm", touch })}>
                <Reply aria-hidden strokeWidth={1.75} />
                Reply
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** The members' comment form at rest: label, empty field, hint and the disabled Post button. */
function CommentFormStatic() {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-meta font-medium text-foreground">Add a comment</span>
      <div className="min-h-20 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm leading-relaxed text-subtle">
        Share what you know or ask a follow-up…
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex items-center gap-3 text-meta text-muted">
          <span>Markdown and @mentions work here.</span>
        </p>
        <div className="ml-auto flex items-center gap-3">
          <span aria-hidden className="inline-flex items-center gap-1 text-meta text-subtle">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
          </span>
          <span className={buttonClasses({ disabled: true })}>Post comment</span>
        </div>
      </div>
    </div>
  );
}
