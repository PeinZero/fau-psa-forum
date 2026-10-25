import Link from "next/link";

import { CategoryGlyph } from "@/components/thread/category-icon";
import { cn } from "@/components/ui/cn";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";

import { CardArrow, LandingSection } from "./section";
import { landingCard } from "./start-here";
import { topicCountLabel } from "./shape";

export type Topic = { id: number; slug: string; name: string; description: string | null; threadCount: number };

const title = "Browse by topic";
const description = "Every thread sits in one of these, from the residence permit to your first job.";
const grid = "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3";

export function TopicsView({ topics }: { topics: readonly Topic[] }) {
  if (topics.length === 0) return null;
  return (
    <LandingSection id="topics" title={title} description={description} link={{ href: "/browse", label: "Browse all" }}>
      <ul className={grid}>
        {topics.map((topic, i) => {
          const count = topicCountLabel(topic.threadCount);
          return (
            <li key={topic.id} className="animate-fade-up" style={stagger(i)}>
              <Link href={`/c/${topic.slug}`} className={cn(landingCard, "gap-3 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-5")}>
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center sm:size-10 justify-center rounded-lg border border-border bg-background text-muted transition-colors duration-150 ease-out group-hover:text-accent"
                >
                  <CategoryGlyph slug={topic.slug} className="size-[1.125rem]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 truncate text-body font-semibold text-foreground" title={topic.name}>
                      {topic.name}
                    </span>
                    <CardArrow className="-translate-x-1 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 max-sm:hidden" />
                  </span>
                  {topic.description && (
                    // Phones show two tiles a row, where the name alone says enough.
                    <span className="mt-0.5 line-clamp-2 text-meta text-pretty text-muted max-sm:hidden">{topic.description}</span>
                  )}
                  {count && <span className="mt-0.5 block sm:mt-2 text-meta font-medium tabular-nums text-subtle">{count}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </LandingSection>
  );
}

export function TopicsSkeleton() {
  return (
    <LandingSection id="topics" title={title} description={description} link={{ href: "/browse", label: "Browse all" }} busy>
      <div className={grid}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-[7.25rem] flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:h-[6.75rem] sm:flex-row sm:gap-4 sm:p-5">
            <Skeleton className="size-9 shrink-0 rounded-lg sm:size-10" />
            <div className="flex-1">
              <Skeleton className="mt-1 h-4 w-1/2" />
              <Skeleton className="mt-2.5 h-3 w-full max-sm:hidden" />
              <Skeleton className="mt-2 h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </LandingSection>
  );
}
