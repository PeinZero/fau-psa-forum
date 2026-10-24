import { MessageSquare } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CategoryGlyph } from "@/components/thread/category-icon";
import type { ThreadDetail } from "@/components/thread/thread-data";
import { fetchBrowseThreads, fetchCategoriesWithCounts } from "@/components/thread/thread-list";
import { countLabel } from "@/lib/labels";

import { AboutCard, GuidesCard, SidebarCard, SidebarCardSkeleton } from "./cards";
import { SidebarSticky } from "./feed-layout";

const RELATED_LIMIT = 5;

/** The thread's category with a way to ask, then what else is hot there. */
export async function ThreadSidebar({ thread }: { thread: ThreadDetail }) {
  const category = (await fetchCategoriesWithCounts()).find((c) => c.id === thread.category_id);

  return (
    <>
      {category ? (
        <AboutCard
          title={category.name}
          icon={
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
              <CategoryGlyph slug={category.slug} />
            </span>
          }
          description={category.description}
          meta={
            <Link href={`/c/${category.slug}`} className="rounded-sm font-medium text-accent hover:underline">
              {countLabel(category.threadCount, "thread")} in {category.name}
            </Link>
          }
        />
      ) : (
        <AboutCard />
      )}
      <SidebarSticky>
        {category && (
          <Suspense fallback={<SidebarCardSkeleton rows={RELATED_LIMIT} tall />}>
            <RelatedThreads categoryId={category.id} categoryName={category.name} currentId={thread.id} />
          </Suspense>
        )}
        <Suspense fallback={<SidebarCardSkeleton rows={4} tall />}>
          <GuidesCard />
        </Suspense>
      </SidebarSticky>
    </>
  );
}

async function RelatedThreads({
  categoryId,
  categoryName,
  currentId,
}: {
  categoryId: number;
  categoryName: string;
  currentId: number;
}) {
  const threads = (await fetchBrowseThreads({ sort: "hot", categoryId, limit: RELATED_LIMIT + 1 }))
    .filter((thread) => thread.id !== currentId)
    .slice(0, RELATED_LIMIT);
  if (threads.length === 0) return null;

  return (
    <SidebarCard title={`More in ${categoryName}`}>
      <ul className="flex flex-col">
        {threads.map((thread) => (
          <li key={thread.id}>
            <Link
              href={`/t/${thread.slug}`}
              className="-mx-2 block rounded-lg px-2 py-2 transition-colors duration-150 ease-out hover:bg-surface-hover active:bg-surface-hover/70 focus-visible:-outline-offset-2"
            >
              <span className="line-clamp-2 text-body font-medium break-words text-foreground">{thread.title}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-meta tabular-nums text-muted">
                <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5" />
                {countLabel(thread.comment_count, "comment")}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}
