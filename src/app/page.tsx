import { Suspense } from "react";

import { ClosingCta } from "@/components/landing/closing-cta";
import { CommunityStripSkeleton } from "@/components/landing/community-strip";
import { Hero } from "@/components/landing/hero";
import { IntroVideo } from "@/components/landing/intro-video";
import { HowItWorks } from "@/components/landing/how-it-works";
import { PopularQuestionsSkeleton } from "@/components/landing/popular-questions";
import {
  CommunityStrip,
  LatestAnnouncement,
  PopularQuestions,
  StartHere,
  Topics,
} from "@/components/landing/sections";
import { StartHereSkeleton } from "@/components/landing/start-here";
import { TopicsSkeleton } from "@/components/landing/topics";
import { DeletedNotice } from "@/components/notice/deleted-notice";

/** A landing page for newcomers; the feed itself lives on /browse. */
export default function Home() {
  return (
    <>
      <div className="mb-6 empty:hidden">
        <Suspense fallback={null}>
          <DeletedNotice />
        </Suspense>
      </div>
      <Hero />
      <IntroVideo />
      <div className="mx-auto mt-20 flex w-full max-w-5xl flex-col gap-16 pb-6 sm:mt-28 sm:gap-24 lg:mt-32 lg:gap-28">
        <Suspense fallback={<StartHereSkeleton />}>
          <StartHere />
        </Suspense>
        <Suspense fallback={<TopicsSkeleton />}>
          <Topics />
        </Suspense>
        <Suspense fallback={<PopularQuestionsSkeleton />}>
          <PopularQuestions />
        </Suspense>
        <HowItWorks />
        <Suspense fallback={null}>
          <LatestAnnouncement />
        </Suspense>
        <Suspense fallback={<CommunityStripSkeleton />}>
          <CommunityStrip />
        </Suspense>
        <ClosingCta />
      </div>
    </>
  );
}
