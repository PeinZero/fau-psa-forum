"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/field";
import { submitWithoutReset, useSyncedState } from "@/lib/form-sync";

import { changeRole } from "./actions";

type Role = "member" | "moderator" | "superadmin";

export function RoleForm({ target, name, role }: { target: string; name: string; role: Role }) {
  const [state, formAction, pending] = useActionState(changeRole, null);
  const uid = useId();
  const [value, setValue] = useSyncedState<Role>(role);
  const [confirming, setConfirming] = useState(false);
  const changed = value !== role;
  const panelRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const returnFocus = useRef(false);

  useEffect(() => {
    if (confirming) {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      selectRef.current?.focus();
    }
  }, [confirming]);

  return (
    <form
      onSubmit={submitWithoutReset(formAction)}
      className="grid gap-2"
      aria-describedby={state ? `${uid}-msg` : undefined}
    >
      <input type="hidden" name="target" value={target} />
      <Label htmlFor={`${uid}-role`} className="sr-only">
        Role of {name}
      </Label>
      <div className="flex flex-wrap gap-2">
        <Select
          ref={selectRef}
          id={`${uid}-role`}
          name="role"
          value={value}
          onChange={(e) => {
            setValue(e.target.value as Role);
            setConfirming(false);
          }}
          className="min-w-0 flex-1 sm:w-40 sm:flex-none"
        >
          <option value="member">Member</option>
          <option value="moderator">Moderator</option>
          <option value="superadmin">Superadmin</option>
        </Select>
        {changed && !confirming && (
          <Button variant="secondary" onClick={() => setConfirming(true)}>
            Change role
          </Button>
        )}
      </div>
      {changed && confirming && (
        <div ref={panelRef} className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
          <p className="text-meta text-muted">
            Change {name} from {role} to {value}?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Saving..." : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                returnFocus.current = true;
                setConfirming(false);
                setValue(role);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
      {state && (
        <p id={`${uid}-msg`} role={state.ok ? "status" : "alert"} className={state.ok ? "text-meta text-muted" : "text-meta text-danger"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
