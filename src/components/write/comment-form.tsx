"use client";

import { CornerDownRight, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { useIsApple } from "@/components/command/platform";
import { createCommentAction } from "./actions";
import { CharCounter } from "./char-counter";
import { SubmitHint } from "./submit-hint";

export const COMMENT_MAX = 5000;

/** The handle a reply was opened for, from its "@handle " prefill. */
export function replyTarget(prefill: string): string | null {
  return /^@([A-Za-z0-9_]{3,20})\s*$/.exec(prefill)?.[1] ?? null;
}

type Props = {
  threadId: number;
  /** Top-level comment this reply belongs to; renders the compact reply form. */
  parentId?: number;
  initialValue?: string;
  /** Called after a successful post and on cancel; shows a Cancel button when set. */
  onDone?: () => void;
  autoFocus?: boolean;
};

export function CommentForm({ threadId, parentId, initialValue = "", onDone, autoFocus = false }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState(initialValue);
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isApple = useIsApple();
  const isReply = parentId !== undefined;
  const replyingTo = isReply ? replyTarget(initialValue) : null;
  // A reply that is only the pre-filled @handle says nothing yet.
  const empty = body.trim().length === 0 || (isReply && body.trim() === initialValue.trim());

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!autoFocus || !textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [autoFocus]);

  function submit() {
    if (pending || empty) return;
    setError(null);
    setPosted(false);
    startTransition(async () => {
      const result = await createCommentAction(threadId, body, parentId);
      // Committed with the re-rendered thread, so the form never closes before the comment shows.
      startTransition(() => {
        if (!result.ok) setError(result.error);
        else if (onDone) onDone();
        else {
          setBody("");
          setPosted(true);
        }
      });
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="flex flex-col gap-2"
      noValidate
    >
      {replyingTo ? (
        <Label htmlFor={`${id}-body`} className="flex items-center gap-1.5 font-normal text-muted">
          <CornerDownRight aria-hidden strokeWidth={1.75} className="size-4 text-subtle" />
          <span>
            Replying to <span className="font-medium text-foreground">@{replyingTo}</span>
          </span>
        </Label>
      ) : (
        <Label htmlFor={`${id}-body`} className={isReply ? "sr-only" : undefined}>
          {isReply ? "Write a reply" : "Add a comment"}
        </Label>
      )}
      <MentionTextarea
        ref={textareaRef}
        id={`${id}-body`}
        value={body}
        onValueChange={setBody}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          } else if (e.key === "Escape" && onDone && !pending) onDone();
        }}
        required
        readOnly={pending}
        maxLength={COMMENT_MAX}
        rows={isReply ? 2 : 3}
        placeholder={isReply ? undefined : "Share what you know or ask a follow-up…"}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${errorId} ${id}-hint` : `${id}-hint`}
        className={isReply ? "min-h-16 [field-sizing:content] max-h-64" : "min-h-20 [field-sizing:content] max-h-80"}
      />
      <FieldError id={errorId} message={error ?? undefined} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p id={`${id}-hint`} className="flex items-center gap-3 text-meta text-muted">
          <span>Markdown and @mentions work here.</span>
          <CharCounter length={body.length} max={COMMENT_MAX} />
        </p>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <p role="status" className="text-meta text-accent">
            {posted ? <span className="animate-fade-in">Comment posted</span> : null}
          </p>
          <SubmitHint isApple={isApple} />
          {onDone && (
            <Button size={isReply ? "sm" : "md"} variant="ghost" disabled={pending} onClick={onDone}>
              Cancel
            </Button>
          )}
          <Button type="submit" size={isReply ? "sm" : "md"} disabled={pending || empty}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {isReply ? (pending ? "Replying…" : "Reply") : pending ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </div>
    </form>
  );
}
