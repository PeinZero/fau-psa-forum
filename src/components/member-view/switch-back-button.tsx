"use client";

import { useTransition } from "react";

import { setMemberView } from "./actions";

export function SwitchBackButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => setMemberView(false))}
      className="inline-flex items-center rounded-sm font-medium text-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:decoration-foreground disabled:opacity-60 pointer-coarse:min-h-11"
    >
      {pending ? "Switching…" : "Switch back"}
    </button>
  );
}
