import { ArrowRight, Megaphone, X } from "lucide-react";

import { cn } from "../ui/cn";

/** Bar height in site px: 40px row plus the 1px hairline (45px on touch). */
export const ANNOUNCEMENT_BAR_HEIGHT = 41;
export const ANNOUNCEMENT_BAR_HEIGHT_TOUCH = 45;

export type AnnouncementBarProps = {
  /** Announcement title, e.g. "Welcome to the PSA FAU Community Forum". */
  title: string;
  /** Pinned announcements say "Pinned", otherwise "New". */
  pinned: boolean;
  device?: "desktop" | "phone";
};

/** The pinned-announcement bar above the header on every page (newest pinned, else newest). */
export function AnnouncementBar({ title, pinned, device = "desktop" }: AnnouncementBarProps) {
  const phone = device === "phone";
  return (
    <div className="border-b border-accent/25 bg-accent-soft">
      <div className={cn("mx-auto flex w-full max-w-6xl items-center gap-2", phone ? "min-h-11 px-4" : "min-h-10 px-6")}>
        <span className="flex min-w-0 flex-1 items-center gap-2.5 self-stretch text-small text-foreground">
          <Megaphone aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-accent" />
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-meta leading-none font-semibold tracking-wide text-accent-foreground uppercase">
            {pinned ? "Pinned" : "New"}
          </span>
          <span className="min-w-0 truncate font-medium">{title}</span>
          <span className="inline-flex shrink-0 items-center gap-1 font-medium text-accent">
            Read
            <ArrowRight aria-hidden strokeWidth={2} className="size-3.5" />
          </span>
        </span>
        <span
          aria-hidden
          className={cn(
            "-mr-2 inline-flex shrink-0 items-center justify-center rounded-full text-muted",
            phone ? "size-11" : "size-8",
          )}
        >
          <X aria-hidden strokeWidth={1.75} className="size-4" />
        </span>
      </div>
    </div>
  );
}
