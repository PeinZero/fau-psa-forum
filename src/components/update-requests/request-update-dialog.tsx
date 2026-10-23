"use client";

import { CircleCheck, LoaderCircle } from "lucide-react";
import { type FormEvent, useEffect, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/field";

import { requestUpdate } from "./actions";
import { UPDATE_NOTE_MAX } from "./limits";

/** Modal opened from the thread menu; the browser returns focus to the menu trigger on close. */
export function RequestUpdateDialog({ threadId, open, onClose }: { threadId: number; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-xl border border-border bg-background p-0 text-foreground shadow-[0_24px_48px_-12px_var(--shadow-color)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-fade-up"
    >
      {open && <RequestForm threadId={threadId} titleId={titleId} onClose={onClose} />}
    </dialog>
  );
}

function RequestForm({ threadId, titleId, onClose }: { threadId: number; titleId: string; onClose: () => void }) {
  const id = useId();
  const noteId = `${id}-note`;
  const hintId = `${id}-hint`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const doneRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

  if (done) {
    return (
      <div role="status" className="flex flex-col items-start gap-4 p-5">
        <div className="flex items-center gap-2">
          <CircleCheck aria-hidden strokeWidth={1.75} className="size-5 text-accent" />
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            Thanks, request sent
          </h2>
        </div>
        <p className="text-sm text-muted">A moderator will re-check this thread.</p>
        <Button ref={doneRef} variant="secondary" size="md" onClick={onClose} className="self-end">
          Done
        </Button>
      </div>
    );
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = note.trim();
    startTransition(async () => {
      const result = await requestUpdate({ threadId, note: trimmed === "" ? undefined : trimmed });
      if (result.ok) setDone(true);
      else setError(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          Request an update
        </h2>
        <p id={hintId} className="text-meta text-muted">
          Tell moderators if something here has changed, e.g. a new form, fee or office address.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={noteId}>What changed? (optional)</Label>
        <Textarea
          id={noteId}
          value={note}
          maxLength={UPDATE_NOTE_MAX}
          disabled={pending}
          autoFocus
          onChange={(event) => setNote(event.target.value)}
          aria-describedby={`${hintId} ${counterId}${error ? ` ${errorId}` : ""}`}
          className="min-h-20"
        />
        <span id={counterId} className="self-end text-meta tabular-nums text-subtle">
          {note.length}/{UPDATE_NOTE_MAX}
        </span>
      </div>

      <FieldError id={errorId} message={error ?? undefined} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" disabled={pending}>
          {pending ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden /> : null}
          {pending ? "Sending…" : "Send request"}
        </Button>
      </div>
    </form>
  );
}
