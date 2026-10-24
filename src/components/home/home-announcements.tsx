import { Megaphone, Pin } from "lucide-react";
import Link from "next/link";

import { announcementHref } from "@/components/announcements/data";
import { announcementExcerpt } from "@/components/announcements/excerpt";
import { cardClasses } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { stagger } from "@/components/ui/motion";
import { formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/time";

import { SectionHeader } from "./section-header";

const RECENT_LIMIT = 2;
const select = "id, title, body, is_pinned, created_at";

/** The newest pinned announcement, then the most recent others. */
async function fetchHomeAnnouncements() {
  const supabase = await createClient();
  const [pinned, recent] = await Promise.all([
    supabase.from("announcements").select(select).eq("is_pinned", true).order("created_at", { ascending: false }).limit(1),
    supabase.from("announcements").select(select).order("created_at", { ascending: false }).limit(RECENT_LIMIT + 1),
  ]);
  const lead = pinned.data?.[0];
  const rest = (recent.data ?? []).filter((row) => row.id !== lead?.id).slice(0, RECENT_LIMIT);
  return { items: lead ? [lead, ...rest] : rest, fetchedAt: Date.now() };
}

/** Hidden when there are no announcements. */
export async function HomeAnnouncements() {
  const { items, fetchedAt } = await fetchHomeAnnouncements();
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="announcements-heading" className="flex flex-col gap-3">
      <SectionHeader
        id="announcements-heading"
        title="Announcements"
        href="/announcements"
        linkLabel="See all announcements"
      />
      <ul className={cardClasses({ padding: "none", className: "overflow-hidden divide-y divide-border" })}>
        {items.map((item, i) => {
          const Icon = item.is_pinned ? Pin : Megaphone;
          const excerpt = announcementExcerpt(item.body, 160);
          return (
            <li key={item.id} className="animate-fade-up" style={stagger(i)}>
              <Link
                href={announcementHref(item.id)}
                className="group flex items-start gap-3 px-4 py-3 transition-colors duration-150 ease-out hover:bg-surface-hover focus-visible:-outline-offset-2 sm:px-5"
              >
                <span
                  aria-hidden
                  className={
                    item.is_pinned
                      ? "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-accent/20 bg-accent-soft text-accent"
                      : "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted"
                  }
                >
                  <Icon strokeWidth={1.75} className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 break-words text-[15px] font-medium leading-snug text-foreground">
                      {item.is_pinned && <span className="sr-only">Pinned: </span>}
                      {item.title}
                    </span>
                    <time
                      dateTime={item.created_at}
                      title={formatDate(item.created_at)}
                      className="shrink-0 whitespace-nowrap text-meta text-subtle"
                    >
                      {relativeTime(item.created_at, fetchedAt)}
                    </time>
                  </span>
                  {excerpt && <span className="mt-0.5 line-clamp-1 text-meta text-muted">{excerpt}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function HomeAnnouncementsSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">Loading announcements…</span>
      <Skeleton className="h-5 w-32" />
      <div className={cardClasses({ padding: "none", className: "divide-y divide-border" })}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 sm:px-5">
            <Skeleton className="size-7 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="mt-2 h-3.5 w-4/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
