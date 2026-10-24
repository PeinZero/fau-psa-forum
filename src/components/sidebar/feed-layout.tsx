import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/**
 * Feed beside a sidebar from lg up; below that the sidebar follows the feed, because on a phone
 * the threads are what people came for.
 */
export function FeedLayout({
  children,
  sidebar,
  sidebarLabel = "Community",
  className,
}: {
  children: ReactNode;
  sidebar: ReactNode;
  sidebarLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-12 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10 xl:gap-14", className)}>
      <div className="min-w-0">{children}</div>
      <aside aria-label={sidebarLabel} className="flex min-w-0 flex-col gap-4">
        {sidebar}
      </aside>
    </div>
  );
}

/** The last group of sidebar cards stays in view while the feed scrolls (the header is 3.5rem). */
export function SidebarSticky({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4 lg:sticky lg:top-20">{children}</div>;
}
