import { PenLine, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CategoryGrid, CategoryGridSkeleton } from "@/components/home/category-grid";
import { GuidesLink } from "@/components/home/guides-link";
import { HomeAnnouncements, HomeAnnouncementsSkeleton } from "@/components/home/home-announcements";
import { HomeThreads, HomeThreadsSection, HomeThreadsSkeleton } from "@/components/home/home-threads";
import { DeletedNotice } from "@/components/notice/deleted-notice";
import { OpenSearchButton } from "@/components/thread/open-search-button";
import { SearchShortcut } from "@/components/thread/search-shortcut";
import { buttonClasses } from "@/components/ui/button";
import { stagger } from "@/components/ui/motion";

export default function Home() {
  return (
    <div className="flex flex-col gap-12 sm:gap-14">
      <Suspense fallback={null}>
        <DeletedNotice />
      </Suspense>
      <section className="hero-glow flex flex-col items-center text-center sm:pt-6">
        <p
          className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-meta text-muted backdrop-blur"
          style={stagger(0)}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          Pakistan Student Association · FAU Erlangen-Nürnberg
        </p>
        <h1
          className="animate-fade-up mt-4 max-w-3xl text-[1.875rem] font-semibold leading-[1.12] tracking-[-0.03em] text-balance sm:text-5xl sm:leading-[1.08]"
          style={stagger(1)}
        >
          Answers for Pakistani students in Erlangen&nbsp;&amp;&nbsp;Nuremberg
        </h1>
        <p className="animate-fade-up mt-4 max-w-xl text-body text-muted sm:text-base" style={stagger(2)}>
          Residence permits, courses, housing and first steps, curated by moderators from the PSA community.
        </p>
        <div
          className="animate-fade-up mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
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
        <GuidesLink className="animate-fade-up mt-6 w-full max-w-md" />
      </section>

      <Suspense fallback={<HomeAnnouncementsSkeleton />}>
        <HomeAnnouncements />
      </Suspense>

      <div className="grid gap-12 sm:gap-14 lg:grid-cols-2 lg:gap-6">
        <HomeThreadsSection id="hot-heading" title="Hot this week" href="/browse">
          <Suspense fallback={<HomeThreadsSkeleton />}>
            <HomeThreads sort="hot" emptyText="Nothing is hot yet" />
          </Suspense>
        </HomeThreadsSection>
        <HomeThreadsSection id="new-heading" title="New" href="/browse?sort=new">
          <Suspense fallback={<HomeThreadsSkeleton />}>
            <HomeThreads sort="new" emptyText="No threads yet" />
          </Suspense>
        </HomeThreadsSection>
      </div>

      <section aria-labelledby="categories-heading" className="flex flex-col gap-3">
        <h2 id="categories-heading" className="text-sm font-medium text-muted">
          Categories
        </h2>
        <Suspense fallback={<CategoryGridSkeleton />}>
          <CategoryGrid />
        </Suspense>
      </section>
    </div>
  );
}
