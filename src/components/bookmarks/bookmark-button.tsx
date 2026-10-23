"use client";

import { Bookmark, BookmarkCheck, BellRing } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";

export function BookmarkButton({ bookmarked, onToggle }: { bookmarked: boolean; onToggle: () => void }) {
  const Icon = bookmarked ? BookmarkCheck : Bookmark;
  return (
    <button
      type="button"
      aria-label="Bookmark thread"
      aria-pressed={bookmarked}
      title={bookmarked ? "Remove bookmark" : "Bookmark"}
      onClick={onToggle}
      className={buttonClasses({
        variant: "ghost",
        size: "icon",
        className: bookmarked ? "text-accent hover:text-accent" : undefined,
      })}
    >
      <Icon aria-hidden strokeWidth={1.75} />
    </button>
  );
}

export function FollowingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap px-1 text-meta text-muted" title="You get notified of new answers">
      <BellRing aria-hidden strokeWidth={1.75} className="size-3.5" />
      Following
    </span>
  );
}
