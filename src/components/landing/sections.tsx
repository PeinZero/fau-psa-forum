import { Suspense } from "react";

import { CommunityStripView, ModeratorApplyLink } from "./community-strip";
import { getDoneCount, getHomeGuides, getHomeModerators, getHomeTopics, getPopularQuestions, isSignedIn } from "./data";
import { PopularQuestionsView } from "./popular-questions";
import type { HomeGuide } from "./shape";
import { GuideProgressLine, StartHereView } from "./start-here";
import { TopicsView } from "./topics";

// The sections read cached public data, so they render into the prerendered page without a fallback.
// Only the session-dependent bits stream, each into a slot the same size as its fallback.

export async function StartHere() {
  return <StartHereView guides={await getHomeGuides()} progress={(guide) => <ProgressSlot guide={guide} />} />;
}

function ProgressSlot({ guide }: { guide: HomeGuide }) {
  return (
    <Suspense fallback={<GuideProgressLine stepCount={guide.stepIds.length} doneCount={null} />}>
      <ViewerProgress guide={guide} />
    </Suspense>
  );
}

async function ViewerProgress({ guide }: { guide: HomeGuide }) {
  return <GuideProgressLine stepCount={guide.stepIds.length} doneCount={await getDoneCount(guide.stepIds)} />;
}

export async function Topics() {
  return <TopicsView topics={await getHomeTopics()} />;
}

export async function PopularQuestions() {
  return <PopularQuestionsView questions={await getPopularQuestions()} />;
}

export async function CommunityStrip() {
  return (
    <CommunityStripView
      {...await getHomeModerators()}
      apply={
        <Suspense fallback={<ModeratorApplyLink signedIn={false} />}>
          <ViewerApplyLink />
        </Suspense>
      }
    />
  );
}

async function ViewerApplyLink() {
  return <ModeratorApplyLink signedIn={await isSignedIn()} />;
}
