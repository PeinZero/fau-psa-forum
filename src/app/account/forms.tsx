"use client";

import { Check, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import {
  applyForModerator,
  deleteAccount,
  updateProfile,
  type FormState,
} from "./actions";
import { Button } from "@/components/ui/button";
import {
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/field";
import { affiliationLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";

function Feedback({ id, state }: { id: string; state: FormState }) {
  if (!state) return null;
  return state.ok ? (
    <p
      id={id}
      role="status"
      className="flex items-center gap-1.5 text-meta text-accent"
    >
      <Check className="size-4" strokeWidth={1.75} aria-hidden />
      {state.message}
    </p>
  ) : (
    <FieldError id={id} message={state.message} />
  );
}

export function ProfileForm({
  displayName,
  username,
  affiliation,
}: {
  displayName: string;
  /** Null when the viewer has no profile row; the field is hidden then. */
  username: string | null;
  affiliation: Enums<"affiliation"> | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, null);
  const usernameError = state?.field === "username" ? state.message : undefined;
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          minLength={2}
          maxLength={40}
          defaultValue={displayName}
          autoComplete="nickname"
        />
      </div>
      {username !== null && (
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <div className="relative">
            <span
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted sm:text-sm"
            >
              @
            </span>
            <Input
              id="username"
              name="username"
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]{3,20}"
              defaultValue={username}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={usernameError ? true : undefined}
              aria-describedby={usernameError ? "username-error username-note" : "username-note"}
              className="pl-7"
            />
          </div>
          <FieldError id="username-error" message={usernameError} />
          <p id="username-note" className="text-meta text-muted">
            3–20 letters, numbers or underscores. Your profile:{" "}
            <Link
              href={`/u/${username}`}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              /u/{username}
            </Link>
          </p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="affiliation">Affiliation</Label>
        <Select
          id="affiliation"
          name="affiliation"
          defaultValue={affiliation ?? ""}
          aria-describedby="affiliation-note"
        >
          <option value="">None</option>
          {Object.entries(affiliationLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <p id="affiliation-note" className="text-meta text-muted">
          Self-chosen and not verified; it is shown next to your name.
        </p>
      </div>
      {!usernameError && <Feedback id="profile-feedback" state={state} />}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save profile"}
      </Button>
    </form>
  );
}

export function ModeratorApplicationForm() {
  const [state, action, pending] = useActionState(applyForModerator, null);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="motivation">Why do you want to moderate?</Label>
        <Textarea
          id="motivation"
          name="motivation"
          required
          minLength={20}
          maxLength={1000}
          rows={5}
          aria-describedby="motivation-note"
        />
        <p id="motivation-note" className="text-meta text-muted">
          20 to 1000 characters.
        </p>
      </div>
      <Feedback id="application-feedback" state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending..." : "Send application"}
      </Button>
    </form>
  );
}

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [state, action, pending] = useActionState(deleteAccount, null);

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete account
      </Button>
    );
  }

  return (
    <form
      action={action}
      className="space-y-4 rounded-lg border border-danger/25 bg-danger/5 p-4"
    >
      <p className="flex items-start gap-2 text-sm text-foreground">
        <TriangleAlert
          className="mt-0.5 size-4 shrink-0 text-danger"
          strokeWidth={1.75}
          aria-hidden
        />
        <span>
          This removes your login and profile for good. Your threads and
          comments stay visible as &ldquo;Deleted user&rdquo;.
        </span>
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">
          Type <span className="font-mono text-danger">DELETE</span> to confirm
        </Label>
        <Input
          id="confirm"
          name="confirm"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          aria-describedby="delete-feedback"
        />
      </div>
      <div id="delete-feedback">
        <Feedback id="delete-feedback-message" state={state} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant="danger"
          disabled={pending || typed.trim() !== "DELETE"}
        >
          {pending ? "Deleting..." : "Delete my account"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
