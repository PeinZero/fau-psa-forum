"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/field";
import {
  RESTRICTION_DURATIONS,
  RESTRICTION_REASON_MAX,
  type Restriction,
  restrictionStatus,
} from "@/lib/restrictions";

import { ActionButton } from "./action-button";
import { liftRestriction, restrictUser } from "./actions";

type Props = {
  target: string;
  name: string;
  /** Active restrictions of the target, most important first. */
  active: readonly Restriction[];
  /** The viewer may restrict this account at all (never themselves, the superadmin, or staff unless superadmin). */
  canRestrict: boolean;
  /** Superadmins ban and lift bans. */
  canBan: boolean;
};

/** Active mute/ban badges with Lift, and a Restrict panel asking for kind, duration and reason. */
export function RestrictControls({ target, name, active, canRestrict, canBan }: Props) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const [state, formAction, pending] = useActionState(async (prev: Parameters<typeof restrictUser>[0], formData: FormData) => {
    const result = await restrictUser(prev, formData);
    if (result?.ok) setOpen(false);
    return result;
  }, null);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("select, textarea")?.focus();
  }, [open]);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {active.map((restriction) => (
        <div key={restriction.id} className="flex flex-col gap-1.5 rounded-lg border border-danger/25 bg-danger/[0.04] p-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="danger">{restriction.kind === "ban" ? "Banned" : "Muted"}</Badge>
            <span className="text-meta text-muted">{restrictionStatus(restriction)}</span>
          </div>
          <p className="break-words text-meta text-muted">
            <span className="font-medium text-foreground">Reason:</span> {restriction.reason}
          </p>
          {(restriction.kind === "mute" || canBan) && canRestrict && (
            <ActionButton
              action={liftRestriction}
              fields={{ restrictionId: restriction.id }}
              label={restriction.kind === "ban" ? "Lift ban" : "Lift mute"}
              pendingLabel="Lifting…"
              confirm={`Lift this ${restriction.kind === "ban" ? "ban" : "mute"} on ${name}? They are notified.`}
            />
          )}
        </div>
      ))}

      {canRestrict && !open && (
        <Button variant="danger" size="sm" onClick={() => setOpen(true)} className="self-start">
          Restrict
        </Button>
      )}

      {canRestrict && open && (
        <form action={formAction} aria-describedby={state ? `${uid}-msg` : undefined}>
          <input type="hidden" name="target" value={target} />
          <div ref={panelRef} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:min-w-72">
            <p className="text-meta text-muted">
              {name} keeps reading. A mute stops posting, commenting, voting and reporting; a ban also stops edits. They
              are notified and see the reason.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                {canBan ? (
                  <>
                    <Label htmlFor={`${uid}-kind`}>Restriction</Label>
                    <Select id={`${uid}-kind`} name="kind" defaultValue="mute">
                      <option value="mute">Mute</option>
                      <option value="ban">Ban</option>
                    </Select>
                  </>
                ) : (
                  <>
                    <span className="text-meta font-medium text-foreground">Restriction</span>
                    <input type="hidden" name="kind" value="mute" />
                    <p className="flex min-h-9 items-center text-small">Mute</p>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${uid}-duration`}>For</Label>
                <Select id={`${uid}-duration`} name="duration" defaultValue="7 days">
                  {RESTRICTION_DURATIONS.map((duration) => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-reason`}>Reason (shown to {name})</Label>
              <Textarea
                id={`${uid}-reason`}
                name="reason"
                required
                maxLength={RESTRICTION_REASON_MAX}
                rows={3}
                className="min-h-20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="danger" size="sm" disabled={pending}>
                {pending ? "Restricting…" : "Restrict account"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </form>
      )}

      {state && (
        <p
          id={`${uid}-msg`}
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "text-meta text-muted" : "text-meta text-danger"}
        >
          {state.message}
        </p>
      )}
    </div>
  );
}
