import { ArrowRight, PenLine, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { LatestAnnouncementBanner } from "@/components/announcements/latest-banner";
import { CategoryIcon } from "@/components/thread/category-icon";
import { OpenSearchButton } from "@/components/thread/open-search-button";
import { SearchShortcut } from "@/components/thread/search-shortcut";
import {
  fetchCategoriesWithCounts,
  fetchThreadList,
  ThreadList,
  ThreadListSkeleton,
} from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      <LatestAnnouncementBanner />
      <Suspense fallback={null}>
        <DeletedNotice searchParams={searchParams} />
      </Suspense>
      <section className="hero-glow flex flex-col items-center pt-4 text-center sm:pt-10">
        <p
          className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-meta text-muted backdrop-blur"
          style={stagger(0)}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          Pakistani Students Association · FAU
        </p>
        <h1
          className="animate-fade-up mt-5 max-w-4xl text-[2.125rem] font-semibold leading-[1.1] tracking-[-0.035em] text-balance sm:text-6xl sm:leading-[1.05]"
          style={stagger(1)}
        >
          Answers for Pakistani students in Erlangen&nbsp;&amp;&nbsp;Nürnberg
        </h1>
        <p className="animate-fade-up mt-5 max-w-xl text-base text-muted sm:text-lg" style={stagger(2)}>
          Residence permits, courses, housing and first steps, curated by moderators from the PSA
          community.
        </p>
        <div
          className="animate-fade-up mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
          style={stagger(3)}
        >
          <Link href="/new" className={buttonClasses({ className: "sm:min-h-10 sm:px-5" })}>
            <PenLine strokeWidth={1.75} />
            Ask a question
          </Link>
          <OpenSearchButton
            className={buttonClasses({ variant: "secondary", className: "sm:min-h-10 sm:pl-4 sm:pr-2.5" })}
          >
            <Search strokeWidth={1.75} className="text-muted" />
            Search threads
            <SearchShortcut className="ml-2 hidden gap-0.5 md:inline-flex" />
          </OpenSearchButton>
        </div>
      </section>

      <section aria-labelledby="categories-heading" className="flex flex-col gap-4">
        <SectionHeading id="categories-heading">Categories</SectionHeading>
        <Suspense fallback={<CategoriesSkeleton />}>
          <Categories />
        </Suspense>
      </section>

      <section aria-labelledby="threads-heading" className="flex flex-col gap-4">
        <SectionHeading id="threads-heading">Latest threads</SectionHeading>
        <Suspense fallback={<ThreadListSkeleton />}>
          <LatestThreads />
        </Suspense>
      </section>
    </div>
  );
}

function SectionHeading({ id, children }: { id: string; children: string }) {
  return (
    <h2 id={id} className="text-sm font-medium text-muted">
      {children}
    </h2>
  );
}

const categoryGrid = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";

async function Categories() {
  const categories = await fetchCategoriesWithCounts();
  return (
    <ul className={categoryGrid}>
      {categories.map((category, i) => (
        <li key={category.id} className="animate-fade-up" style={stagger(i)}>
          <Link
            href={`/c/${category.slug}`}
            className={cardClasses({ interactive: true, className: "group flex h-full items-start gap-3.5" })}
          >
            <CategoryIcon
              slug={category.slug}
              className="transition-colors duration-200 group-hover:border-accent/30 group-hover:text-accent"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate font-medium text-foreground">{category.name}</span>
                <span className="shrink-0 text-meta tabular-nums text-subtle">
                  {category.threadCount} {category.threadCount === 1 ? "thread" : "threads"}
                </span>
              </span>
              {category.description && (
                <span className="mt-0.5 line-clamp-2 text-meta text-muted">{category.description}</span>
              )}
            </span>
            <ArrowRight
              aria-hidden
              strokeWidth={1.75}
              className="mt-0.5 hidden size-4 shrink-0 -translate-x-1 text-subtle opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:block"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CategoriesSkeleton() {
  return (
    <div role="status" aria-busy="true" className={categoryGrid}>
      <span className="sr-only">Loading categories…</span>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className={cardClasses({ className: "flex items-start gap-3.5" })}>
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

async function LatestThreads() {
  const threads = await fetchThreadList({});
  return <ThreadList threads={threads} emptyText="No threads yet" />;
}

async function DeletedNotice({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  if (deleted !== "1") return null;
  return (
    <p role="status" className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-foreground">
      Your account was deleted.
    </p>
  );
}
