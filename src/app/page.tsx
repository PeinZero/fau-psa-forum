import { BookOpen, PenLine } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { HomeFeed, HomeFeedSkeleton, MobilePinnedAnnouncement } from "@/components/home/home-feed";
import { DeletedNotice } from "@/components/notice/deleted-notice";
import {
  AboutCard,
  AnnouncementsCard,
  CategoriesCard,
  GuidesCard,
  SidebarCardSkeleton,
  SidebarLinks,
} from "@/components/sidebar/cards";
import { FeedLayout, SidebarSticky } from "@/components/sidebar/feed-layout";
import { buttonClasses } from "@/components/ui/button";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <div className="mb-6 empty:hidden">
        <Suspense fallback={null}>
          <DeletedNotice />
        </Suspense>
      </div>
      <FeedLayout sidebar={<HomeSidebar />}>
        <Welcome />
        <Suspense fallback={null}>
          <MobilePinnedAnnouncement />
        </Suspense>
        <Suspense fallback={<HomeFeedSkeleton />}>
          <HomeFeed searchParams={searchParams} />
        </Suspense>
      </FeedLayout>
    </>
  );
}

function Welcome() {
  return (
    <header className="mb-8">
      <p className="text-meta font-medium text-accent">Pakistan Student Association · FAU Erlangen-Nürnberg</p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground">
        Answers for Pakistani students in Erlangen&nbsp;&amp;&nbsp;Nuremberg
      </h1>
      <p className="mt-2 max-w-2xl text-body text-muted">
        Residence permits, courses, housing and first steps, curated by moderators from the PSA community.
      </p>
      {/* From lg up the same actions sit in the sidebar. */}
      <div className="mt-5 flex flex-wrap gap-2 lg:hidden">
        <Link href="/new" className={buttonClasses()}>
          <PenLine strokeWidth={1.75} />
          Ask a question
        </Link>
        <Link href="/guides" className={buttonClasses({ variant: "secondary" })}>
          <BookOpen strokeWidth={1.75} className="text-muted" />
          Guides for newcomers
        </Link>
      </div>
    </header>
  );
}

function HomeSidebar() {
  return (
    <>
      <AboutCard className="max-lg:hidden" />
      <Suspense fallback={<SidebarCardSkeleton rows={3} tall className="max-lg:hidden" />}>
        <AnnouncementsCard className="max-lg:hidden" />
      </Suspense>
      <Suspense fallback={<SidebarCardSkeleton rows={4} tall />}>
        <GuidesCard />
      </Suspense>
      <SidebarSticky>
        <Suspense fallback={<SidebarCardSkeleton rows={6} />}>
          <CategoriesCard />
        </Suspense>
        <SidebarLinks />
      </SidebarSticky>
    </>
  );
}
