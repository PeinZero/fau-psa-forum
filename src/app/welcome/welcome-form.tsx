"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateProfile, type FormState } from "@/app/account/actions";
import { Avatar } from "@/components/author";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/field";
import { CharCounter } from "@/components/write/char-counter";
import { ChoiceGroup } from "@/components/write/choice-group";
import { affiliationLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";

type Props = {
  next: string;
  displayName: string;
  username: string;
  affiliation: Enums<"affiliation"> | null;
};

const DISPLAY_NAME_MAX = 40;
const USERNAME_MAX = 20;

const affiliationChoices = [
  { value: "", label: "None" },
  ...Object.entries(affiliationLabels).map(([value, label]) => ({ value, label })),
];

/** Lowercase letters, digits and underscores only, as the database stores handles. */
export function normalizeUsername(value: string): string {
  return value.replace(/^@/, "").toLowerCase();
}

export function WelcomeForm({ next, displayName, username, affiliation }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState({ displayName, username, affiliation: affiliation ?? "" });
  const [state, setState] = useState<FormState>(null);
  const [pending, startTransition] = useTransition();
  const set = (patch: Partial<typeof fields>) => setFields((current) => ({ ...current, ...patch }));

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setState(null);
    startTransition(async () => {
      const result = await updateProfile(null, formData);
      if (result?.ok) router.replace(next);
      else setState(result);
    });
  }

  const usernameError = state?.field === "username" ? state.message : undefined;
  const formError = state && !state.ok && !usernameError ? state.message : undefined;
  const previewName = fields.displayName.trim() || "Your name";
  const badge = fields.affiliation ? affiliationLabels[fields.affiliation as Enums<"affiliation">] : null;

  return (
    <Card className="flex animate-fade-up flex-col gap-6 p-5 sm:p-7">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold tracking-tight">Welcome to the forum</h1>
        <p className="text-meta text-muted">
          Confirm how you appear next to your questions and answers. You can change this later in your account.
        </p>
      </div>

      <div
        aria-label="Preview"
        className="flex items-center gap-3 rounded-lg bg-background px-3 py-3 ring-1 ring-border"
      >
        <Avatar name={previewName} size="md" />
        <div className="flex min-w-0 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{previewName}</span>
            {badge ? <Badge>{badge}</Badge> : null}
          </span>
          <span className="truncate text-meta text-muted">@{fields.username || "username"}</span>
        </div>
      </div>

      {formError ? (
        <p
          role="alert"
          className="flex animate-fade-in items-start gap-2 rounded-md border border-danger/25 bg-danger/10 p-3 text-meta text-danger"
        >
          <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          {formError}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <fieldset disabled={pending} className="contents">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              name="display_name"
              required
              minLength={2}
              maxLength={DISPLAY_NAME_MAX}
              value={fields.displayName}
              onChange={(e) => set({ displayName: e.target.value })}
              autoComplete="nickname"
              aria-describedby="display_name-note"
            />
            <div className="flex items-start justify-between gap-3">
              <p id="display_name-note" className="text-meta text-muted">
                Your real first name works well.
              </p>
              <CharCounter length={fields.displayName.length} max={DISPLAY_NAME_MAX} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-subtle sm:text-sm"
              >
                @
              </span>
              <Input
                id="username"
                name="username"
                required
                minLength={3}
                maxLength={USERNAME_MAX}
                pattern="[A-Za-z0-9_]{3,20}"
                value={fields.username}
                onChange={(e) => {
                  set({ username: normalizeUsername(e.target.value) });
                  if (usernameError) setState(null);
                }}
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
              3–20 letters, numbers or underscores. People mention you with it.
            </p>
          </div>

          <ChoiceGroup
            name="affiliation"
            legend="Badge (optional)"
            value={fields.affiliation}
            options={affiliationChoices}
            onChange={(value) => set({ affiliation: value })}
            describedBy="affiliation-note"
            hint={
              <p id="affiliation-note" className="text-meta text-muted">
                Shown next to your name. Self-chosen, not verified.
              </p>
            }
          />
        </fieldset>

        <div className="mt-1 flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending ? "Saving…" : "Continue"}
          </Button>
          <Link
            href={next}
            className="inline-flex min-h-8 items-center self-center rounded-md px-2 text-meta text-muted underline-offset-2 transition-colors duration-150 hover:text-foreground hover:underline pointer-coarse:min-h-11"
          >
            Skip for now
          </Link>
        </div>
      </form>
    </Card>
  );
}
