"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";

import { changeRole } from "./actions";

type Role = "member" | "moderator" | "superadmin";

export function RoleForm({ target, name, role }: { target: string; name: string; role: Role }) {
  const [state, formAction, pending] = useActionState(changeRole, null);
  const uid = useId();
  const [value, setValue] = useState<Role>(role);
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
    <form action={formAction} className="grid gap-2" aria-describedby={state ? `${uid}-msg` : undefined}>
      <input type="hidden" name="target" value={target} />
      <label htmlFor={`${uid}-role`} className="text-sm font-medium">
        Role of {name}
      </label>
      <div className="flex flex-wrap gap-2">
        <select
          ref={selectRef}
          id={`${uid}-role`}
          name="role"
          value={value}
          onChange={(e) => {
            setValue(e.target.value as Role);
            setConfirming(false);
          }}
          className="min-h-11 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="member">Member</option>
          <option value="moderator">Moderator</option>
          <option value="superadmin">Superadmin</option>
        </select>
        {changed && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex min-h-11 items-center rounded-md border border-input px-3 text-sm font-medium"
          >
            Change role
          </button>
        )}
      </div>
      {changed && confirming && (
        <div ref={panelRef} className="flex flex-col gap-2 rounded-md border border-border p-3">
          <p className="text-sm">
            Change {name} from {role} to {value}?
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-11 items-center rounded-md bg-red-700 px-3 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? "Saving..." : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => {
                returnFocus.current = true;
                setConfirming(false);
                setValue(role);
              }}
              className="inline-flex min-h-11 items-center rounded-md border border-input px-3 text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {state && (
        <p id={`${uid}-msg`} role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-muted" : "text-sm text-red-700 dark:text-red-400"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
