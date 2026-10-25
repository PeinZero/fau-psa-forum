import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/** Sidebar cards are a step up from the page (`surface`), never outlined. */
export const cardClasses = "rounded-xl bg-surface px-4 py-4 sm:px-5";

export const cardHeading = "text-body font-semibold text-foreground";

/** Rows bleed into the card padding so their hover fill reaches the card's inner edge. */
export const cardRow =
  "group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ease-out hover:bg-surface-hover active:bg-surface-hover/70 focus-visible:-outline-offset-2";

/** The 28px icon tile at the start of a sidebar row; `active` marks the current page. */
export function RowIcon({ active = false, className, children }: { active?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
        active ? "bg-accent-soft text-accent" : "bg-raised text-muted group-hover:text-accent",
        className,
      )}
    >
      {children}
    </span>
  );
}
