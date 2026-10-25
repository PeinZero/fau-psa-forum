"use client";

import { LoaderCircle } from "lucide-react";
import { type FormEvent, useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogHeader, DialogSuccess } from "@/components/ui/dialog";
import { FieldError, Label, Textarea } from "@/components/ui/field";
import { CharCounter } from "@/components/write/char-counter";

import { requestUpdate } from "./actions";
import { UPDATE_NOTE_MAX } from "./limits";

/** Modal opened from the thread menu. */
export function RequestUpdateDialog({ threadId, open, onClose }: { threadId: number; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose}>
      <RequestForm threadId={threadId} onClose={onClose} />
    </Dialog>
  );
}

function RequestForm({ threadId, onClose }: { threadId: number; onClose: () => void }) {
  const id = useId();
  const noteId = `${id}-note`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;

  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <DialogSuccess title="Thanks, request sent">A moderator will re-check this thread.</DialogSuccess>;
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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader
        title="Request an update"
        description="Tell the moderators if something here has changed, e.g. a new form, fee or office address."
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={noteId}>What changed? (optional)</Label>
        <Textarea
          id={noteId}
          value={note}
          maxLength={UPDATE_NOTE_MAX}
          disabled={pending}
          onChange={(event) => setNote(event.target.value)}
          aria-describedby={`${counterId}${error ? ` ${errorId}` : ""}`}
          placeholder="What is out of date, and where did you see the new details?"
          className="min-h-20"
        />
        <CharCounter id={counterId} length={note.length} max={UPDATE_NOTE_MAX} className="self-end" />
      </div>

      <FieldError id={errorId} message={error ?? undefined} />

      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="motion-safe:animate-spin" strokeWidth={1.75} aria-hidden /> : null}
          {pending ? "Sending…" : "Send request"}
        </Button>
      </DialogActions>
    </form>
  );
}
