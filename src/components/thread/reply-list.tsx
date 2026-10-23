"use client";

import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useId, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { stagger } from "@/components/ui/motion";

const COLLAPSE_ABOVE = 3;
const VISIBLE_WHEN_COLLAPSED = 2;

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/**
 * Client-side navigation (e.g. from a notification) sets the hash without updating `:target`,
 * so the highlight also follows the hash read on mount.
 */
function useHash(): string {
  return useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
}

export function CommentAnchor({ commentId, className, children }: { commentId: number; className?: string; children: ReactNode }) {
  const hash = useHash();
  return (
    <div
      id={`comment-${commentId}`}
      className={cn("comment-anchor scroll-mt-24", hash === `#comment-${commentId}` && "is-target", className)}
    >
      {children}
    </div>
  );
}

/** Long reply chains show their latest replies; a link to an earlier reply expands the chain. */
export function ReplyList({ replies }: { replies: { id: number; node: ReactNode }[] }) {
  const listId = useId();
  const hash = useHash();
  const collapsible = replies.length > COLLAPSE_ABOVE;
  const earlier = collapsible ? replies.slice(0, -VISIBLE_WHEN_COLLAPSED) : [];
  const targetsEarlier = earlier.some((reply) => hash === `#comment-${reply.id}`);
  const [choice, setChoice] = useState<boolean | null>(null);
  const expanded = !collapsible || (choice ?? targetsEarlier);
  const shown = expanded ? replies : replies.slice(-VISIBLE_WHEN_COLLAPSED);
  const revealedCount = shown.length - (replies.length - earlier.length);

  // The browser looked for the anchor before the collapsed reply existed, so it never scrolled there.
  useEffect(() => {
    if (targetsEarlier && choice === null) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [targetsEarlier, choice, hash]);

  return (
    <>
      {collapsible && (
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setChoice(!expanded)}
          className="-ml-3 mt-1 self-start text-muted"
        >
          <ChevronDown
            aria-hidden
            strokeWidth={1.75}
            className={cn("transition-transform duration-200", expanded && "rotate-180")}
          />
          {expanded ? "Show fewer replies" : `Show ${earlier.length} more ${earlier.length === 1 ? "reply" : "replies"}`}
        </Button>
      )}
      <ul id={listId} aria-label={`${replies.length} ${replies.length === 1 ? "reply" : "replies"}`} className="flex flex-col">
        {shown.map((reply, i) => (
          <li
            key={reply.id}
            id={`comment-${reply.id}`}
            // Newly revealed replies fade in one after another; the rest keep their place.
            style={stagger(i < revealedCount ? i : 0)}
            className={cn("comment-anchor animate-fade-up scroll-mt-24", hash === `#comment-${reply.id}` && "is-target")}
          >
            {reply.node}
          </li>
        ))}
      </ul>
    </>
  );
}
