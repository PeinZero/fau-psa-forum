"use client";

import { CircleCheck, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { FieldError, Label, Textarea } from "@/components/ui/field";
import { CharCounter } from "@/components/write/char-counter";

import { type ReportInput, reportContent } from "./actions";

type Reason = ReportInput["reason"];

const REASONS: ReadonlyArray<{ value: Reason; label: string }> = [
  { value: "spam", label: "Spam" },
  { value: "offensive", label: "Offensive or abusive" },
  { value: "wrong_info", label: "Wrong or outdated information" },
  { value: "personal_data", label: "Shares someone's personal data" },
  { value: "other", label: "Something else" },
];

const DETAILS_MAX = 500;

/**
 * Report reasons in a modal dialog, opened from a menu item. The browser returns focus to the
 * element that was focused before it opened (the menu trigger).
 */
export function ReportDialog({
  target,
  subject,
  open,
  onClose,
}: {
  target: ReportInput["target"];
  /** "thread" or "comment", used in the title. */
  subject: string;
  open: boolean;
  onClose: () => void;
}) {
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
        // A click on the backdrop lands on the <dialog> element itself.
        if (event.target === event.currentTarget) onClose();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] rounded-xl border border-border bg-background p-0 text-foreground shadow-[0_24px_48px_-12px_var(--shadow-color)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-fade-up"
    >
      {open && <ReportForm target={target} subject={subject} titleId={titleId} onClose={onClose} />}
    </dialog>
  );
}

function ReportForm({
  target,
  subject,
  titleId,
  onClose,
}: {
  target: ReportInput["target"];
  subject: string;
  titleId: string;
  onClose: () => void;
}) {
  const id = useId();
  const groupName = `${id}-reason`;
  const detailsId = `${id}-details`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;

  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reasonMissing, setReasonMissing] = useState(false);
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
            Thanks for reporting
          </h2>
        </div>
        <p className="text-meta text-muted">A moderator will review it.</p>
        <Button ref={doneRef} variant="secondary" size="md" onClick={onClose} className="self-end">
          Done
        </Button>
      </div>
    );
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason) {
      setReasonMissing(true);
      setError("Please choose a reason.");
      return;
    }
    setError(null);
    setReasonMissing(false);
    const trimmed = details.trim();
    startTransition(async () => {
      const result = await reportContent({ target, reason, details: trimmed === "" ? undefined : trimmed });
      if (result.ok) setDone(true);
      else setError(result.message);
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-1">
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          Report this {subject}
        </h2>
        <p className="text-meta text-muted">Only moderators see reports. Pick the reason that fits best.</p>
      </div>
      <fieldset disabled={pending} aria-describedby={reasonMissing ? errorId : undefined} className="flex flex-col">
        <legend className="mb-2 text-meta font-medium text-foreground">Reason</legend>
        <div
          className={cn(
            "flex flex-col divide-y divide-border overflow-hidden rounded-lg border",
            reasonMissing ? "border-danger/50" : "border-border",
          )}
        >
          {REASONS.map((option, index) => (
            <label
              key={option.value}
              className="flex min-h-10 cursor-pointer items-center gap-3 px-3 text-sm text-foreground transition-colors duration-150 ease-out hover:bg-surface-hover has-checked:bg-accent-soft pointer-coarse:min-h-11"
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={reason === option.value}
                autoFocus={index === 0}
                onChange={() => {
                  setReason(option.value);
                  setReasonMissing(false);
                }}
                className="size-4 shrink-0 accent-accent"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={detailsId}>Details (optional)</Label>
        <Textarea
          id={detailsId}
          value={details}
          maxLength={DETAILS_MAX}
          disabled={pending}
          onChange={(event) => setDetails(event.target.value)}
          aria-describedby={counterId}
          placeholder="Anything that helps a moderator, e.g. what is wrong and what is right."
          className="min-h-20"
        />
        <CharCounter id={counterId} length={details.length} max={DETAILS_MAX} className="self-end" />
      </div>

      <FieldError id={errorId} message={error ?? undefined} />

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" size="md" disabled={pending}>
          {pending ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden /> : null}
          {pending ? "Sending…" : "Submit report"}
        </Button>
      </div>
    </form>
  );
}
