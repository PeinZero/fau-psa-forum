"use client";

import { Flag, LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/field";

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

export function ReportButton({ target }: { target: { threadId: number } | { commentId: number } }) {
  const id = useId();
  const panelId = `${id}-panel`;
  const groupName = `${id}-reason`;
  const detailsId = `${id}-details`;
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reasonMissing, setReasonMissing] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstReasonRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) firstReasonRef.current?.focus();
  }, [open]);

  function reset() {
    setReason(null);
    setDetails("");
    setError(null);
    setReasonMissing(false);
  }

  function close() {
    reset();
    setOpen(false);
    triggerRef.current?.focus();
  }

  function toggle() {
    if (open) {
      close();
      return;
    }
    setDone(false);
    setOpen(true);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
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
      const result = await reportContent({
        target,
        reason,
        details: trimmed === "" ? undefined : trimmed,
      });
      if (result.ok) {
        reset();
        setDone(true);
        setOpen(false);
        triggerRef.current?.focus();
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="sm"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
      >
        <Flag strokeWidth={1.75} aria-hidden />
        Report
      </Button>

      <p role="status" className="text-meta text-muted">
        {done ? "Thanks — moderators will review it." : null}
      </p>

      {open ? (
        <div
          id={panelId}
          onKeyDown={onKeyDown}
          className="w-full rounded-lg border border-border bg-surface p-4 sm:max-w-sm animate-fade-up"
        >
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
            <fieldset
              disabled={pending}
              aria-describedby={reasonMissing ? errorId : undefined}
              className="flex flex-col gap-1"
            >
              <legend className="mb-1 text-meta font-medium text-foreground">Why are you reporting this?</legend>
              {REASONS.map((option, index) => (
                <label
                  key={option.value}
                  className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 text-sm text-foreground hover:bg-surface-hover"
                >
                  <input
                    ref={index === 0 ? firstReasonRef : undefined}
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
              />
              <span id={counterId} className="self-end text-meta tabular-nums text-subtle">
                {details.length}/{DETAILS_MAX}
              </span>
            </div>

            <FieldError id={errorId} message={error ?? undefined} />

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" size="md" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" size="md" disabled={pending}>
                {pending ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden /> : null}
                {pending ? "Sending…" : "Submit report"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
