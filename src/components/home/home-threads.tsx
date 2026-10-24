import type { ReactNode } from "react";

import type { BrowseSort } from "@/components/browse/params";
import { fetchBrowseThreads, ThreadList, ThreadListSkeleton } from "@/components/thread/thread-list";

import { SectionHeader } from "./section-header";

const HOME_LIMIT = 5;

/** A short ranked list with a "See all" into /browse on the same sort. */
export function HomeThreadsSection({
  id,
  title,
  href,
  children,
}: {
  id: string;
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <SectionHeader id={id} title={title} href={href} linkLabel={`See all: ${title}`} />
      {children}
    </section>
  );
}

export async function HomeThreads({ sort, emptyText }: { sort: BrowseSort; emptyText: string }) {
  const threads = await fetchBrowseThreads({ sort, limit: HOME_LIMIT });
  return <ThreadList threads={threads} emptyText={emptyText} />;
}

export function HomeThreadsSkeleton() {
  return <ThreadListSkeleton rows={HOME_LIMIT} />;
}
