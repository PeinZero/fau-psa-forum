"use client";

import { Loader2 } from "lucide-react";
import { createContext, type ReactNode, use, useEffect, useId, useRef, useState, useTransition } from "react";

import { Markdown } from "@/components/markdown";
import { MentionTextarea } from "@/components/mentions/mention-textarea";
import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { useIsApple } from "@/components/command/platform";
import { updateCommentAction } from "./actions";
import { CharCounter } from "./char-counter";
import { COMMENT_MAX } from "./comment-form";
import { SubmitHint } from "./submit-hint";

type EditState = { editing: boolean; start: () => void; stop: () => void };

const EditContext = createContext<EditState | null>(null);

/** Shares one comment's edit state between its body and its "Edit" menu item. */
export function CommentEditScope({ children }: { children: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const returnTo = useRef<HTMLElement | null>(null);

  const value: EditState = {
    editing,
    start() {
      // The menu has just returned focus to its trigger; that is where focus goes back after editing.
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setEditing(true);
    },
    stop() {
      setEditing(false);
      requestAnimationFrame(() => returnTo.current?.focus());
    },
  };
  return <EditContext value={value}>{children}</EditContext>;
}

export function useCommentEdit(): EditState | null {
  return use(EditContext);
}

export function CommentEditor({ commentId, body }: { commentId: number; body: string }) {
  const edit = useCommentEdit();
  if (!edit?.editing) return <Markdown>{body}</Markdown>;
  return <EditForm commentId={commentId} body={body} onDone={edit.stop} />;
}

function EditForm({ commentId, body, onDone }: { commentId: number; body: string; onDone: () => void }) {
  const id = useId();
  const errorId = `${id}-error`;
  const [draft, setDraft] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const empty = draft.trim().length === 0;
  const isApple = useIsApple();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  function save() {
    if (pending || empty) return;
    setError(null);
    startTransition(async () => {
      const result = await updateCommentAction(commentId, draft);
      // Committed with the re-rendered thread, so the old text never flashes after saving.
      startTransition(() => {
        if (result.ok) onDone();
        else setError(result.error);
      });
    });
  }

  function cancel() {
    onDone();
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
        readOnly={pending}
        maxLength={COMMENT_MAX}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${errorId} ${id}-hint` : `${id}-hint`}
        className="min-h-20 [field-sizing:content] max-h-80"
      />
      <p id={`${id}-hint`} className="flex items-center gap-3 text-meta text-muted">
        <span>Markdown and @mentions work here. Esc cancels.</span>
        <CharCounter length={draft.length} max={COMMENT_MAX} />
      </p>
      <FieldError id={errorId} message={error ?? undefined} />
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || empty}>
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={cancel}>
          Cancel
        </Button>
        <SubmitHint isApple={isApple} className="ml-auto" />
      </div>
    </form>
  );
}
