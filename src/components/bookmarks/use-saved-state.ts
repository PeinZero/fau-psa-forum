"use client";

import { useOptimistic, useState, useTransition } from "react";

import type { ActionState } from "@/components/mod/actions";

import { setBookmark, setFollow } from "./actions";
import type { SavedState } from "./data";

const messages = {
  bookmarked: { on: "Bookmarked", off: "Bookmark removed" },
  following: { on: "Following this thread", off: "Unfollowed" },
} as const;

/**
 * Bookmark and follow switches that flip immediately and roll back if the server refuses.
 * `report` receives a short status line for the menu.
 */
export function useSavedState(threadId: number, initial: SavedState, report: (feedback: ActionState) => void) {
  const [confirmed, setConfirmed] = useState(initial);
  const [seen, setSeen] = useState(initial);
  const [shown, patchShown] = useOptimistic(confirmed, (state: SavedState, patch: Partial<SavedState>) => ({
    ...state,
    ...patch,
  }));
  const [pending, startTransition] = useTransition();

  // A server re-render brings the stored state, which wins over ours.
  if (seen.bookmarked !== initial.bookmarked || seen.following !== initial.following) {
    setSeen(initial);
    setConfirmed(initial);
  }

  function toggle(key: keyof SavedState) {
    const on = !shown[key];
    report({ ok: true, message: messages[key][on ? "on" : "off"] });
    startTransition(async () => {
      patchShown({ [key]: on });
      const result = await (key === "bookmarked" ? setBookmark : setFollow)({ threadId, on });
      if (result.ok) startTransition(() => setConfirmed((state) => ({ ...state, [key]: on })));
      else report({ ok: false, message: result.message });
    });
  }

  return { state: shown, pending, toggle };
}
