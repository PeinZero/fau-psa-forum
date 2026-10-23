"use client";

import { useEffect, useState, useTransition } from "react";

import type { ActionState } from "@/components/mod/actions";
import { cn } from "@/components/ui/cn";

export type ModAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;
export type RunAction = (action: ModAction, fields: Record<string, string | number | undefined>) => void;

/** Runs server actions from menu items and keeps a short status line next to the menu. */
export function useMenuAction() {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<ActionState>(null);

  useEffect(() => {
    if (!feedback?.ok) return;
    const timer = setTimeout(() => setFeedback(null), 2500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const run: RunAction = (action, fields) => {
    const formData = new FormData();
    for (const [name, value] of Object.entries(fields)) if (value !== undefined) formData.set(name, String(value));
    startTransition(async () => {
      const result = await action(null, formData);
      // Shown together with the re-rendered page, not ahead of it.
      startTransition(() => setFeedback(result));
    });
  };

  function copyLink(path: string) {
    navigator.clipboard.writeText(`${window.location.origin}${path}`).then(
      () => setFeedback({ ok: true, message: "Link copied" }),
      () => setFeedback({ ok: false, message: "Couldn't copy the link." }),
    );
  }

  return { pending, feedback, setFeedback, run, copyLink };
}

export function MenuFeedback({ feedback, className }: { feedback: ActionState; className?: string }) {
  return (
    <span
      role={feedback && !feedback.ok ? "alert" : "status"}
      className={cn("text-meta empty:hidden", feedback?.ok ? "text-muted" : "text-danger", className)}
    >
      {feedback?.message}
    </span>
  );
}
