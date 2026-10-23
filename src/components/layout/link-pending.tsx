"use client";

import { useLinkStatus } from "next/link";

import { cn } from "@/components/ui/cn";

/**
 * Render inside a `relative isolate` <Link>: while the destination streams in, the clicked link
 * takes on its active look at once, so a slow server never makes a click feel ignored.
 * `data-pending` lets a surrounding group dim the link that is still marked current.
 */
export function LinkPending({ className }: { className: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden
      data-pending={pending || undefined}
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 rounded-md transition-opacity duration-150 ease-out",
        pending ? "animate-pulse opacity-100" : "opacity-0",
        className,
      )}
    />
  );
}
