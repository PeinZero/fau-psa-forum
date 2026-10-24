import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { announcementHref } from "@/components/announcements/data";
import { announcementExcerpt } from "@/components/announcements/excerpt";
import { AnnouncementIcon } from "@/components/sidebar/cards";
import { fetchLatestAnnouncements } from "@/components/sidebar/data";
import { fetchBrowseThreads, ThreadList, ThreadListSkeleton } from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/labels";
import { relativeTime } from "@/lib/time";

import { browseAllHref, type HomeSort, homeSortHref, homeSorts, parseHomeSort } from "./feed-params";

const HOME_LIMIT = 10;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/** One ranked feed; the tabs only change the sort, the rest of the list lives on /browse. */
export async function HomeFeed({ searchParams }: { searchParams: SearchParams }) {
  const sort = parseHomeSort((await searchParams).sort);
  const threads = await fetchBrowseThreads({ sort, period: sort === "top" ? "week" : undefined, limit: HOME_LIMIT });

  return (
    <section aria-labelledby="feed-heading">
      <h2 id="feed-heading" className="sr-only">
        Threads
      </h2>
      <FeedTabs current={sort} />
      <ThreadList
        threads={threads}
        emptyText={sort === "top" ? "No top threads this week yet" : "No threads yet"}
      />
      {threads.length === HOME_LIMIT && (
        <div className="mt-6 flex justify-center">
          <Link href={browseAllHref(sort)} className={buttonClasses({ variant: "secondary" })}>
            More threads
            <ArrowRight strokeWidth={1.75} />
          </Link>
        </div>
      )}
    </section>
  );
}

function FeedTabs({ current }: { current: HomeSort }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <SegmentedLinks
        label="Sort threads"
        items={homeSorts.map((sort) => ({ href: homeSortHref(sort.value), label: sort.label, current: sort.value === current }))}
      />
      <Link
        href={browseAllHref(current)}
        className="-mr-2 inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-meta font-medium text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-foreground pointer-coarse:min-h-11"
      >
        Browse all
        <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
      </Link>
    </div>
  );
}

export function HomeFeedSkeleton() {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-44 rounded-lg pointer-coarse:h-12" />
        <Skeleton className="h-4 w-14" />
      </div>
      <ThreadListSkeleton rows={HOME_LIMIT} />
    </div>
  );
}

/** Phones see the sidebar only after the feed, so the pinned announcement comes first there. */
export async function MobilePinnedAnnouncement() {
  const { items, fetchedAt } = await fetchLatestAnnouncements();
  const pinned = items.find((item) => item.is_pinned);
  if (!pinned) return null;
  const excerpt = announcementExcerpt(pinned.body, 140);
  return (
    <Link
      href={announcementHref(pinned.id)}
      className="mb-6 flex items-start gap-3 rounded-xl bg-surface px-4 py-3.5 transition-colors duration-150 hover:bg-surface-hover active:bg-surface-hover/70 lg:hidden"
    >
      <AnnouncementIcon pinned />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3 text-meta text-muted">
          <span className="font-medium text-accent">Pinned announcement</span>
          <time dateTime={pinned.created_at} title={formatDate(pinned.created_at)} className="shrink-0">
            {relativeTime(pinned.created_at, fetchedAt)}
          </time>
        </span>
        <span className="mt-0.5 block text-body font-semibold break-words text-foreground">{pinned.title}</span>
        {excerpt && <span className="mt-0.5 line-clamp-2 text-meta text-muted">{excerpt}</span>}
      </span>
    </Link>
  );
}
