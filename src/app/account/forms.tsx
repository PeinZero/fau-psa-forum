"use client";

import { useActionState } from "react";
import { applyForModerator, updateProfile, type FormState } from "./actions";
import { affiliationLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";

const inputClass = "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-60";

function Feedback({ id, state }: { id: string; state: FormState }) {
  if (!state) return null;
  return state.ok ? (
    <p id={id} role="status" className="text-sm">
      {state.message}
    </p>
  ) : (
    <p id={id} role="alert" className="text-sm text-red-700 dark:text-red-400">
      {state.message}
    </p>
  );
}

export function ProfileForm({
  displayName,
  affiliation,
}: {
  displayName: string;
  affiliation: Enums<"affiliation"> | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="display_name" className="block text-sm font-medium">
          Display name
        </label>
        <input
          id="display_name"
          name="display_name"
          required
          minLength={2}
          maxLength={40}
          defaultValue={displayName}
          autoComplete="nickname"
          className={inputClass}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="affiliation" className="block text-sm font-medium">
          Affiliation
        </label>
        <select
          id="affiliation"
          name="affiliation"
          defaultValue={affiliation ?? ""}
          aria-describedby="affiliation-note"
          className={inputClass}
        >
          <option value="">None</option>
          {Object.entries(affiliationLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p id="affiliation-note" className="text-sm text-muted">
          Self-chosen and not verified; it is shown next to your name.
        </p>
      </div>
      <Feedback id="profile-feedback" state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}

export function ModeratorApplicationForm() {
  const [state, action, pending] = useActionState(applyForModerator, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="motivation" className="block text-sm font-medium">
          Why do you want to moderate?
        </label>
        <textarea
          id="motivation"
          name="motivation"
          required
          minLength={20}
          maxLength={1000}
          rows={5}
          aria-describedby="motivation-note"
          className={inputClass}
        />
        <p id="motivation-note" className="text-sm text-muted">
          20 to 1000 characters.
        </p>
      </div>
      <Feedback id="application-feedback" state={state} />
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Sending..." : "Send application"}
      </button>
    </form>
  );
}
