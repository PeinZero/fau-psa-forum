"use client";

import { X } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

const STORAGE_KEY = "psa-dismissed-announcement";
const DISMISS_EVENT = "psa-announcement-dismissed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(DISMISS_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(DISMISS_EVENT, onChange);
  };
}

// Storage can be unavailable (private mode, blocked site data); the banner then simply stays.
function readDismissed(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Only the latest dismissed id is kept, so a newly pinned announcement shows again. */
export function DismissibleBanner({
  announcementId,
  className,
  children,
}: {
  announcementId: number;
  className?: string;
  children: ReactNode;
}) {
  const dismissed = useSyncExternalStore(subscribe, readDismissed, () => null) === String(announcementId);
  if (dismissed) return null;

  function dismiss() {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(announcementId));
    } catch {
      return;
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <aside
      aria-label="Announcement"
      className={cn(
        "animate-fade-up flex items-center gap-2 rounded-xl border border-accent/20 bg-accent-soft py-1 pl-3 pr-1 text-meta sm:pl-4",
        className,
      )}
    >
      {children}
      <Button variant="ghost" size="icon" aria-label="Dismiss announcement" onClick={dismiss} className="text-muted">
        <X strokeWidth={1.75} />
      </Button>
    </aside>
  );
}
