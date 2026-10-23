"use client";

import { unseenLabel, useUnseenAnnouncements } from "./unseen-store";

/** Overlays its (relatively positioned) parent's corner, so the header keeps its width. */
export function UnseenAnnouncementsBadge() {
  const unseen = useUnseenAnnouncements();
  if (!unseen) return null;
  return (
    <span
      aria-hidden
      className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none tabular-nums text-accent-foreground ring-2 ring-background"
    >
      {unseenLabel(unseen)}
    </span>
  );
}
