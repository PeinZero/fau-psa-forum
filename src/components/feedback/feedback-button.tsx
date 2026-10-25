"use client";

import { LoaderCircle, MessageSquareHeart } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Dialog, DialogActions, DialogHeader, DialogSuccess } from "@/components/ui/dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";
import { CharCounter } from "@/components/write/char-counter";

import { sendFeedback } from "./actions";
import { FEEDBACK_MESSAGE_MAX, FEEDBACK_PAGE_MAX } from "./limits";

type FeedbackButtonProps = {
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

/** A trigger plus its dialog; render it where it stays mounted (e.g. the footer). */
export function FeedbackButton({ label = "Send feedback", variant = "ghost", size = "sm", className }: FeedbackButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        <MessageSquareHeart aria-hidden strokeWidth={1.75} />
        {label}
      </Button>
      <FeedbackDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/**
 * The dialog alone, for triggers that unmount when clicked (menu items): keep it mounted next to
 * the menu and control `open` from there.
 */
export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} size="md">
      <FeedbackForm onClose={onClose} />
    </Dialog>
  );
}

function FeedbackForm({ onClose }: { onClose: () => void }) {
  const id = useId();
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;
  const [message, setMessage] = useState("");
  // Read once when the dialog opens, so it names the page the person was looking at.
  const [page, setPage] = useState(() => window.location.pathname.slice(0, FEEDBACK_PAGE_MAX));
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <DialogSuccess title="Thanks for the feedback">It goes straight to the forum team.</DialogSuccess>;
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim()) {
      setError("Please write a few words first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await sendFeedback({ message, page: page.trim() || null });
      if (result.ok) setDone(true);
      else setError(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader
        title="Send feedback"
        description="Something confusing, broken or missing? Tell us. Only moderators read this."
      />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-message`}>Your feedback</Label>
        <Textarea
          id={`${id}-message`}
          value={message}
          required
          maxLength={FEEDBACK_MESSAGE_MAX}
          disabled={pending}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${counterId}${error ? ` ${errorId}` : ""}`}
          placeholder="What happened, and what did you expect?"
          className="min-h-28"
        />
        <CharCounter id={counterId} length={message.length} max={FEEDBACK_MESSAGE_MAX} className="self-end" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-page`}>Page (optional)</Label>
        <Input
          id={`${id}-page`}
          value={page}
          maxLength={FEEDBACK_PAGE_MAX}
          disabled={pending}
          onChange={(event) => setPage(event.target.value)}
          className="font-mono"
        />
      </div>

      <FieldError id={errorId} message={error ?? undefined} />

      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="motion-safe:animate-spin" strokeWidth={1.75} aria-hidden /> : null}
          {pending ? "Sending…" : "Send feedback"}
        </Button>
      </DialogActions>
    </form>
  );
}
