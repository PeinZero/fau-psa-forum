import { Bell, Bookmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { getSavedThreadIds } from "@/components/bookmarks/data";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { fetchThreadsByIds, ThreadList, ThreadListSkeleton } from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { getUserId } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

type Tab = "bookmarks" | "following";
type SearchParams = Promise<{ tab?: string | string[] }>;

const tabs: { tab: Tab; label: string; href: string }[] = [
  { tab: "bookmarks", label: "Bookmarked", href: "/saved" },
  { tab: "following", label: "Following", href: "/saved?tab=following" },
];

function currentTab(tab: string | string[] | undefined): Tab {
  return tab === "following" ? "following" : "bookmarks";
}

function SavedTabs({ current }: { current: Tab | null }) {
  return (
    <SegmentedLinks
      label="Saved lists"
      items={tabs.map((item) => ({ href: item.href, label: item.label, current: item.tab === current }))}
    />
  );
}

async function CurrentSavedTabs({ searchParams }: { searchParams: SearchParams }) {
  const { tab } = await searchParams;
  return <SavedTabs current={currentTab(tab)} />;
}

/** Header and tabs stay in the static shell, so switching lists only swaps the list. */
export default function SavedPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <PageHeader title="Saved" description="Threads you bookmarked and conversations you follow." />
      <div className="flex flex-col gap-5">
        <Suspense fallback={<SavedTabs current={null} />}>
          <CurrentSavedTabs searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<ThreadListSkeleton />}>
          <SavedList searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function SavedList({ searchParams }: { searchParams: SearchParams }) {
  const [{ tab: tabParam }, userId] = await Promise.all([searchParams, getUserId()]);
  if (!userId) {
    return (
      <Card className="text-sm">
        <SignInPrompt next="/saved" purpose="to see your bookmarks and followed threads." />
      </Card>
    );
  }

  const tab = currentTab(tabParam);
  const { ids, error } = await getSavedThreadIds(userId, tab === "following" ? "thread_follows" : "bookmarks");
  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not load your saved threads. Please try again later.
      </p>
    );
  }
  const threads = await fetchThreadsByIds(ids);
  return threads.length === 0 ? <SavedEmpty tab={tab} /> : <ThreadList threads={threads} emptyText="" />;
}

function SavedEmpty({ tab }: { tab: Tab }) {
  const browse = (
    <Link href="/" className={buttonClasses({ variant: "secondary", size: "sm" })}>
      Browse threads
    </Link>
  );
  return tab === "bookmarks" ? (
    <EmptyState icon={<Bookmark />} title="No bookmarks yet" action={browse}>
      Tap the bookmark icon on a thread to keep it here for later.
    </EmptyState>
  ) : (
    <EmptyState icon={<Bell />} title="You're not following any threads" action={browse}>
      Threads you start or comment on are followed automatically. You can also follow any thread from its ⋯ menu.
    </EmptyState>
  );
}
