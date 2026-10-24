"use client";

import { AlertCircle, Loader2, PartyPopper } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateProfile, type FormState } from "@/app/account/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Select } from "@/components/ui/field";
import { affiliationLabels } from "@/lib/labels";
import type { Enums } from "@/lib/supabase/database.types";

type Props = {
  next: string;
  displayName: string;
  username: string;
  affiliation: Enums<"affiliation"> | null;
};

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

  return (
    <Card className="animate-fade-up flex flex-col gap-6 p-5 sm:p-7">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <PartyPopper aria-hidden strokeWidth={1.75} className="size-6" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">Welcome! Confirm how you appear</h1>
          <p className="text-meta text-muted">
            Others see this next to your questions and answers. You can change it later in your account.
          </p>
        </div>
      </div>

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger/10 p-3 text-meta text-danger"
        >
          <AlertCircle aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          {formError}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            name="display_name"
            required
            minLength={2}
            maxLength={40}
            value={fields.displayName}
            onChange={(e) => set({ displayName: e.target.value })}
            autoComplete="nickname"
            aria-describedby="display_name-note"
          />
          <p id="display_name-note" className="text-meta text-muted">
            2–40 characters. Your real first name works well.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
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
              value={fields.username}
              onChange={(e) => set({ username: e.target.value })}
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

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="affiliation">Badge (optional)</Label>
          <Select
            id="affiliation"
            name="affiliation"
            value={fields.affiliation}
            onChange={(e) => set({ affiliation: e.target.value })}
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
            Shown next to your name. Self-chosen, not verified.
          </p>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : null}
            {pending ? "Saving…" : "Continue"}
          </Button>
          <Link
            href={next}
            className="inline-flex min-h-8 items-center self-center rounded-md px-2 text-meta pointer-coarse:min-h-11 text-muted underline-offset-2 hover:text-foreground hover:underline"
          >
            Skip for now
          </Link>
        </div>
      </form>
    </Card>
  );
}
