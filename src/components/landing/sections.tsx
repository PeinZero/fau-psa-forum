import { announcementHref } from "@/components/announcements/data";
import { fetchGuideSummaries } from "@/components/guides/data";
import { fetchLatestAnnouncements } from "@/components/sidebar/data";
import { fetchCategoriesWithCounts } from "@/components/thread/thread-list";

import { CommunityStripView } from "./community-strip";
import { fetchCommunity, fetchPopularQuestions } from "./data";
import { LatestAnnouncementView } from "./latest-announcement";
import { PopularQuestionsView } from "./popular-questions";
import { START_HERE_LIMIT } from "./shape";
import { StartHereView } from "./start-here";
import { TopicsView } from "./topics";

// Each section reads the session or request-time data, so each renders inside its own <Suspense>.

export async function StartHere() {
  const { guides } = await fetchGuideSummaries({ limit: START_HERE_LIMIT });
  return <StartHereView guides={guides} />;
}

export async function Topics() {
  return <TopicsView topics={await fetchCategoriesWithCounts()} />;
}

export async function PopularQuestions() {
  return <PopularQuestionsView questions={await fetchPopularQuestions()} />;
}

/** The pinned announcement leads; without one, the newest. */
export async function LatestAnnouncement() {
  const { items } = await fetchLatestAnnouncements();
  const lead = items[0];
  return <LatestAnnouncementView announcement={lead ? { ...lead, href: announcementHref(lead.id) } : null} />;
}

export async function CommunityStrip() {
  return <CommunityStripView {...await fetchCommunity()} />;
}
