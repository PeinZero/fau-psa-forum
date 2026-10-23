"use client";

import { useSyncExternalStore } from "react";

import { createClient } from "@/lib/supabase/client";

const STORAGE_KEY = "psa-announcements-seen-at";

type Listener = () => void;

let count: number | null = null;
let inflight: Promise<void> | null = null;
let teardown: (() => void) | null = null;
const listeners = new Set<Listener>();

function readLocalSeenAt(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Storage can be unavailable (private mode, blocked site data); the badge then stays hidden. */
export function writeLocalSeenAt(iso: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, iso);
  } catch {
    // Nothing to remember the visit with.
  }
}

function publish(next: number | null) {
  if (next === count) return;
  count = next;
  listeners.forEach((listener) => listener());
}

async function load(): Promise<void> {
  const supabase = createClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;

  let seenAt: string | null = null;
  if (userId) {
    const { data } = await supabase.from("profiles").select("announcements_seen_at").eq("id", userId).maybeSingle();
    seenAt = data?.announcements_seen_at ?? null;
  } else {
    seenAt = readLocalSeenAt();
    // First visit: everything already posted counts as seen.
    if (!seenAt) {
      writeLocalSeenAt(new Date().toISOString());
      publish(0);
      return;
    }
  }
  // A signed-in profile without a timestamp predates the feature; nothing to report.
  if (!seenAt) return publish(0);

  const { count: unseen, error } = await supabase
    .from("announcements")
    .select("id", { count: "exact", head: true })
    .gt("created_at", seenAt);
  if (!error && unseen !== null) publish(unseen);
}

/** Re-reads the count; concurrent callers share one request. */
export function refreshUnseenAnnouncements(): Promise<void> {
  inflight ??= load()
    .catch(() => undefined)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (listeners.size === 1) {
    const onFocus = () => void refreshUnseenAnnouncements();
    const onVisible = () => {
      if (document.visibilityState === "visible") onFocus();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const { data } = createClient().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") onFocus();
    });
    teardown = () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      data.subscription.unsubscribe();
    };
    onFocus();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      teardown?.();
      teardown = null;
    }
  };
}

/** Null until the count is known (and on the server), so nothing renders before mount. */
export function useUnseenAnnouncements(): number | null {
  return useSyncExternalStore(subscribe, () => count, () => null);
}

export function unseenLabel(unseen: number): string {
  return unseen > 9 ? "9+" : String(unseen);
}
