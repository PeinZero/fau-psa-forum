"use client";

import { LoaderCircle } from "lucide-react";
import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Dialog, DialogActions, DialogHeader, DialogSuccess } from "@/components/ui/dialog";
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

/** Report reasons in a modal dialog, opened from a menu item. */
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
  return (
    <Dialog open={open} onClose={onClose}>
      <ReportForm target={target} subject={subject} onClose={onClose} />
    </Dialog>
  );
}

function ReportForm({
  target,
  subject,
  onClose,
}: {
  target: ReportInput["target"];
  subject: string;
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

  if (done) return <DialogSuccess title="Thanks for reporting">A moderator will review it.</DialogSuccess>;

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
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <DialogHeader
        title={`Report this ${subject}`}
        description="Only moderators see reports. Pick the reason that fits best."
      />
      <fieldset disabled={pending} aria-describedby={reasonMissing ? errorId : undefined} className="flex flex-col">
        <legend className="mb-2 text-meta font-medium text-foreground">Reason</legend>
        <div
          className={cn(
            "flex flex-col divide-y divide-border overflow-hidden rounded-lg border",
            reasonMissing ? "border-danger/50" : "border-border",
          )}
        >
          {REASONS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-10 cursor-pointer items-center gap-3 px-3 text-small text-foreground transition-colors duration-150 ease-out hover:bg-surface-hover has-checked:bg-accent-soft pointer-coarse:min-h-11"
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={reason === option.value}
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

      <DialogActions>
        <Button variant="ghost" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? <LoaderCircle className="motion-safe:animate-spin" strokeWidth={1.75} aria-hidden /> : null}
          {pending ? "Sending…" : "Submit report"}
        </Button>
      </DialogActions>
    </form>
  );
}
