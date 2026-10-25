import { Megaphone, Pin } from "lucide-react";
import Link from "next/link";

import { announcementExcerpt } from "@/components/announcements/excerpt";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/labels";

import { CardArrow, LandingSection } from "./section";
import { landingCard } from "./start-here";

export type LandingAnnouncement = {
  href: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
};

const EXCERPT_LENGTH = 220;

/** Hidden when nothing has been announced. */
export function LatestAnnouncementView({ announcement }: { announcement: LandingAnnouncement | null }) {
  if (!announcement) return null;
  const excerpt = announcementExcerpt(announcement.body, EXCERPT_LENGTH);
  const Icon = announcement.is_pinned ? Pin : Megaphone;
  return (
    <LandingSection
      id="announcement"
      title="Latest announcement"
      link={{ href: "/announcements", label: "All announcements" }}
    >
      <Link href={announcement.href} className={cn(landingCard, "gap-4 p-5 sm:flex-row sm:gap-5 sm:p-6")}>
        <span
          aria-hidden
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft max-sm:hidden text-accent ring-1 ring-accent/15 ring-inset"
        >
          <Icon strokeWidth={1.75} className="size-[1.125rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 text-meta text-muted">
            {announcement.is_pinned && (
              <Badge variant="accent">
                <Pin aria-hidden strokeWidth={1.75} />
                Pinned
              </Badge>
            )}
            <time dateTime={announcement.created_at}>{formatDate(announcement.created_at)}</time>
          </span>
          <span className="mt-2 block text-heading font-semibold text-pretty break-words text-foreground">
            {announcement.title}
          </span>
          {excerpt && <span className="mt-1.5 line-clamp-2 max-w-3xl text-small text-pretty text-muted">{excerpt}</span>}
          <span className="mt-4 inline-flex items-center gap-1.5 text-small font-medium text-foreground group-hover:text-accent">
            Read
            <CardArrow className="text-current group-hover:text-current" />
          </span>
        </span>
      </Link>
    </LandingSection>
  );
}
