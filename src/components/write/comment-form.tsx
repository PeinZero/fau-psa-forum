"use client";

import { useId, useState, useTransition } from "react";

import { createCommentAction } from "./actions";

export function CommentForm({ threadId }: { threadId: number }) {
  const id = useId();
  const errorId = `${id}-error`;
  const [body, setBody] = useState("");
  const [posted, setPosted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPosted(false);
    startTransition(async () => {
      const result = await createCommentAction(threadId, body);
      if (result.ok) {
        setBody("");
        setPosted(true);
      }
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
      <label htmlFor={`${id}-body`} className="text-sm font-medium">
        Add a comment
      </label>
      <textarea
        id={`${id}-body`}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={5000}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${errorId} ${id}-hint` : `${id}-hint`}
        className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
      />
      <p id={`${id}-hint`} className="text-xs text-muted">
        Markdown is supported. {body.length}/5000
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <p role="status" className="text-sm text-muted">
        {posted ? "Comment posted" : ""}
      </p>
      <button
        type="submit"
        disabled={pending || body.trim().length === 0}
        className="min-h-11 self-start rounded-md bg-accent px-4 text-accent-foreground disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}
