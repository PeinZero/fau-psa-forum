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
import { getViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

type Tab = "bookmarks" | "following";
type SearchParams = Promise<{ tab?: string | string[] }>;

const tabs: { tab: Tab; label: string; href: string }[] = [
  { tab: "bookmarks", label: "Bookmarked", href: "/saved" },
  { tab: "following", label: "Following", href: "/saved?tab=following" },
];

export default function SavedPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <PageHeader title="Saved" description="Threads you bookmarked and conversations you follow." />
      <Suspense fallback={<ThreadListSkeleton />}>
        <SavedContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SavedContent({ searchParams }: { searchParams: SearchParams }) {
  const [{ tab: tabParam }, viewer] = await Promise.all([searchParams, getViewer()]);
  if (!viewer) {
    return (
      <Card className="text-sm">
        <SignInPrompt next="/saved" purpose="to see your bookmarks and followed threads." />
      </Card>
    );
  }

  const tab: Tab = tabParam === "following" ? "following" : "bookmarks";
  const { ids, error } = await getSavedThreadIds(viewer.userId, tab === "following" ? "thread_follows" : "bookmarks");
  const threads = error ? [] : await fetchThreadsByIds(ids);

  return (
    <div className="flex flex-col gap-5">
      <SegmentedLinks
        label="Saved lists"
        items={tabs.map((item) => ({ href: item.href, label: item.label, current: item.tab === tab }))}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          Could not load your saved threads. Please try again later.
        </p>
      ) : threads.length === 0 ? (
        <SavedEmpty tab={tab} />
      ) : (
        <ThreadList threads={threads} emptyText="" />
      )}
    </div>
  );
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
