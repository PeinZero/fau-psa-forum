import { Suspense } from "react";

import { ClosingCta } from "@/components/landing/closing-cta";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { IntroVideo } from "@/components/landing/intro-video";
import { CommunityStrip, PopularQuestions, StartHere, Topics } from "@/components/landing/sections";
import { DeletedNotice } from "@/components/notice/deleted-notice";

/**
 * A landing page for newcomers; the feed itself lives on /browse. Every section is public and cached,
 * so the page arrives whole in the first HTML instead of filling in section by section.
 */
export default function Home() {
  return (
    <>
      {/* Spaced only once a notice shows: the pending boundary's placeholder would defeat `empty:` and drop the page 24px. */}
      <div className="has-[>:not(template)]:mb-6">
        <Suspense fallback={null}>
          <DeletedNotice />
        </Suspense>
      </div>
      <Hero />
      <IntroVideo />
      <div className="mx-auto mt-20 flex w-full max-w-5xl flex-col gap-16 pb-6 sm:mt-28 sm:gap-24 lg:mt-32 lg:gap-28">
        <StartHere />
        <Topics />
        <PopularQuestions />
        <HowItWorks />
        <CommunityStrip />
        <ClosingCta />
      </div>
    </>
  );
}
