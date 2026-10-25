"use client";

import { CircleCheck, LoaderCircle, MessageSquareHeart } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/field";

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
 * the menu and control `open` from there. The browser returns focus to the opener on close.
 */
export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      className="m-auto w-[min(28rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-xl border border-border bg-background p-0 text-foreground shadow-[0_24px_48px_-12px_var(--shadow-color)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-fade-up"
    >
      {open && <FeedbackForm titleId={titleId} onClose={onClose} />}
    </dialog>
  );
}

function FeedbackForm({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const id = useId();
  const [message, setMessage] = useState("");
  // Read once when the dialog opens, so it names the page the person was looking at.
  const [page, setPage] = useState(() => window.location.pathname.slice(0, FEEDBACK_PAGE_MAX));
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
          <h2 id={titleId} className="text-heading font-semibold tracking-tight">
            Thanks!
          </h2>
        </div>
        <p className="text-sm text-muted">Your feedback goes straight to the forum team.</p>
        <Button ref={doneRef} variant="secondary" size="md" onClick={onClose} className="self-end">
          Done
        </Button>
      </div>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendFeedback({ message, page: page.trim() || null });
      if (result.ok) setDone(true);
      else setError(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-heading font-semibold tracking-tight">
          Send feedback
        </h2>
        <p className="text-meta text-muted">
          Something confusing, broken or missing? Tell us. Only moderators read this.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-message`}>Your feedback</Label>
        <Textarea
          id={`${id}-message`}
          value={message}
          required
          autoFocus
          maxLength={FEEDBACK_MESSAGE_MAX}
          disabled={pending}
          onChange={(event) => setMessage(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-h-28"
        />
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

      <FieldError id={`${id}-error`} message={error ?? undefined} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" size="md" disabled={pending}>
          {pending ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden /> : null}
          {pending ? "Sending…" : "Send feedback"}
        </Button>
      </div>
    </form>
  );
}
