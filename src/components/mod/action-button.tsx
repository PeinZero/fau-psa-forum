"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { ReasonField, type ReasonSpec } from "@/components/ui/reason-field";

import type { ActionState } from "./actions";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string | number>;
  label: string;
  pendingLabel?: string;
  /** Asks for a second click before submitting. */
  confirm?: string;
  /** Asks for a required free-text reason, submitted as `reason`. */
  reason?: ReasonSpec;
  tone?: "default" | "danger";
  /** Overrides the look derived from `tone`. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Runs after the action succeeded, for client-side state the page re-render can't reach. */
  onDone?: () => void;
};

export function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  confirm,
  reason,
  tone = "default",
  variant,
  size = "sm",
  onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const uid = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const [state, formAction, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (result?.ok) {
      returnFocus.current = true;
      setOpen(false);
      onDone?.();
    }
    return result;
  }, null);

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
  const look: ButtonVariant = variant ?? (tone === "danger" ? "danger" : "secondary");
  // The final submit stays recognisable: danger actions confirm in danger, everything else in the accent.
  const submitLook: ButtonVariant = look === "danger" ? "danger" : look === "ghost" ? "secondary" : look;

  return (
    <form action={formAction} className="flex min-w-0 flex-col gap-2" aria-describedby={state ? messageId : undefined}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {needsStep && open && (
        <div
          ref={panelRef}
          className="flex w-full min-w-0 flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:min-w-72"
        >
          {confirm && <p className="text-meta text-muted">{confirm}</p>}
          {reason && <ReasonField id={uid} spec={reason} />}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant={submitLook === "secondary" ? "primary" : submitLook} size={size} disabled={pending}>
              {pending ? (pendingLabel ?? "Working...") : label}
            </Button>
            <Button
              variant="ghost"
              size={size}
              onClick={() => {
                returnFocus.current = true;
                setOpen(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {needsStep && !open && (
        <Button ref={triggerRef} variant={look} size={size} onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}

      {!needsStep && (
        <Button type="submit" variant={look} size={size} disabled={pending}>
          {pending ? (pendingLabel ?? "Working...") : label}
        </Button>
      )}

      {state && (
        <p
          id={messageId}
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-meta text-muted" : "text-meta text-danger"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
