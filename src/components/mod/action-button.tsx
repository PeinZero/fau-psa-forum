"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import type { ActionState } from "./actions";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string | number>;
  label: string;
  pendingLabel?: string;
  /** Asks for a second click before submitting. */
  confirm?: string;
  /** Asks for a required free-text reason, submitted as `reason`. */
  reason?: { label: string; max: number };
  tone?: "default" | "danger";
};

const buttonBase =
  "inline-flex min-h-11 items-center justify-center rounded-md px-3 text-sm font-medium disabled:opacity-60";

export function ActionButton({ action, fields, label, pendingLabel, confirm, reason, tone = "default" }: Props) {
  const [state, formAction, pending] = useActionState(action, null);
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>("textarea, button")?.focus();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);
  const messageId = `${uid}-msg`;
  const needsStep = Boolean(confirm || reason);
  const primary =
    tone === "danger"
      ? "bg-red-700 text-white"
      : "border border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground";

  return (
    <form action={formAction} className="flex flex-col gap-2" aria-describedby={state ? messageId : undefined}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {needsStep && open && (
        <div ref={panelRef} className="flex flex-col gap-2 rounded-md border border-border p-3">
          {confirm && <p className="text-sm">{confirm}</p>}
          {reason && (
            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-reason`} className="text-sm font-medium">
                {reason.label}
              </label>
              <textarea
                id={`${uid}-reason`}
                name="reason"
                required
                maxLength={reason.max}
                rows={3}
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={`${buttonBase} ${tone === "danger" ? primary : "bg-accent text-accent-foreground"}`}>
              {pending ? (pendingLabel ?? "Working...") : label}
            </button>
            <button
              type="button"
              onClick={() => {
                returnFocus.current = true;
                setOpen(false);
              }}
              className={`${buttonBase} border border-input bg-background text-foreground`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {needsStep && !open && (
        <button ref={triggerRef} type="button" onClick={() => setOpen(true)} className={`${buttonBase} ${primary}`}>
          {label}
        </button>
      )}

      {!needsStep && (
        <button type="submit" disabled={pending} className={`${buttonBase} ${primary}`}>
          {pending ? (pendingLabel ?? "Working...") : label}
        </button>
      )}

      {state && (
        <p
          id={messageId}
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-sm text-muted" : "text-sm text-red-700 dark:text-red-400"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
