"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Markdown } from "@/components/markdown";
import { updateCommentAction } from "./actions";

export function CommentEditor({ commentId, body }: { commentId: number; body: string }) {
  const id = useId();
  const errorId = `${id}-error`;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      editRef.current?.focus();
    }
  }, [editing]);

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        <Markdown>{body}</Markdown>
        <button
          ref={editRef}
          type="button"
          onClick={() => {
            setDraft(body);
            setError(null);
            setEditing(true);
          }}
          className="min-h-11 self-start rounded-md px-2 text-sm text-muted underline"
        >
          Edit
        </button>
      </div>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateCommentAction(commentId, draft);
      if (result.ok) {
        restoreFocus.current = true;
        setEditing(false);
      }
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
      <label htmlFor={`${id}-body`} className="text-sm font-medium">
        Edit comment
      </label>
      <textarea
        ref={textareaRef}
        id={`${id}-body`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        required
        maxLength={5000}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-foreground"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending || draft.trim().length === 0}
          className="min-h-11 rounded-md bg-accent px-4 text-accent-foreground disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            restoreFocus.current = true;
            setEditing(false);
          }}
          className="min-h-11 rounded-md border border-border px-4"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
