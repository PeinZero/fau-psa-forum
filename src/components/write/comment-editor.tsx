"use client";

import { Loader2, Pencil } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Markdown } from "@/components/markdown";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { Kbd } from "@/components/ui/kbd";
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
  const empty = draft.trim().length === 0;

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      editRef.current?.focus();
    }
  }, [editing]);

  if (!editing) {
    return (
      <div className="flex flex-col gap-1">
        <Markdown>{body}</Markdown>
        <Button
          ref={editRef}
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(body);
            setError(null);
            setEditing(true);
          }}
          className="-ml-3 self-start text-subtle"
        >
          <Pencil aria-hidden strokeWidth={1.75} />
          Edit
        </Button>
      </div>
    );
  }

  function save() {
    if (pending || empty) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCommentAction(commentId, draft);
      if (result.ok) {
        restoreFocus.current = true;
        setEditing(false);
      } else setError(result.error);
    });
  }

  function cancel() {
    restoreFocus.current = true;
    setEditing(false);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="flex flex-col gap-2"
      noValidate
    >
      <Label htmlFor={`${id}-body`} className="sr-only">
        Edit comment
      </Label>
      <MentionTextarea
        ref={textareaRef}
        id={`${id}-body`}
        value={draft}
        onValueChange={setDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            save();
          } else if (e.key === "Escape") cancel();
        }}
        required
        maxLength={5000}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="min-h-20 [field-sizing:content] max-h-80"
      />
      <p className="text-meta text-muted">Type @ to mention someone.</p>
      <FieldError id={errorId} message={error ?? undefined} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || empty}>
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={cancel}>
          Cancel
        </Button>
        <span className="ml-auto hidden items-center gap-1 text-meta text-subtle pointer-fine:inline-flex" aria-hidden>
          <Kbd>⌘</Kbd>
          <Kbd>Enter</Kbd>
        </span>
      </div>
    </form>
  );
}
