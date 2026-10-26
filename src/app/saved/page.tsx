import { Bell, Bookmark } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { SignInRequired } from "@/components/auth/sign-in-required";
import { fetchThreadsByIds, ThreadList, ThreadListSkeleton } from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";
import { SegmentedLinks } from "@/components/ui/segmented-control";
import { getUserId } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { requestNow } from "@/lib/request-time";

export const metadata: Metadata = { title: "Saved", robots: { index: false } };

type Tab = "bookmarks" | "following";
type SearchParams = Promise<{ tab?: string | string[]; page?: string | string[] }>;

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

/** Signed-out visitors only get the sign-in prompt below; tabs would have nothing to switch. */
async function CurrentSavedTabs({ searchParams }: { searchParams: SearchParams }) {
  const [{ tab }, userId] = await Promise.all([searchParams, getUserId()]);
  if (!userId) return null;
  return <SavedTabs current={currentTab(tab)} />;
}

/** Header and tabs stay in the static shell, so switching lists only swaps the list. */
export default function SavedPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <PageHeader title="Saved" description="Threads you bookmarked and conversations you follow." />
      <div className="flex flex-col gap-6">
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
  const now = await requestNow();
  const [{ tab: tabParam, page: pageParam }, userId] = await Promise.all([searchParams, getUserId()]);
  if (!userId) {
    return (
      <SignInRequired next="/saved" title="Sign in to see your saved threads">
        Bookmarks and followed conversations are kept for you here.
      </SignInRequired>
    );
  }

  const tab = currentTab(tabParam);
  const page = parsePage(pageParam);
  const from = (page - 1) * PAGE_SIZE;
  const supabase = await createClient();
  const query =
    tab === "following"
      ? supabase.from("thread_follows").select("thread_id", { count: "exact" })
      : supabase.from("bookmarks").select("thread_id", { count: "exact" });
  const { data, count, error } = await query
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) {
    return (
      <p role="alert" className="text-body text-danger">
        Could not load your saved threads. Please try again later.
      </p>
    );
  }
  const total = count ?? 0;
  if (total === 0) return <SavedEmpty tab={tab} />;
  const threads = await fetchThreadsByIds(data.map((row) => row.thread_id));
  return (
    <>
      <ThreadList now={now} threads={threads} emptyText="" />
      <Pagination
        path="/saved"
        params={{ tab: tab === "following" ? "following" : undefined }}
        page={page}
        total={total}
      />
    </>
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
    <EmptyState icon={<Bell />} title="Not following any threads yet" action={browse}>
      Threads you start or comment on are followed automatically. You can also follow any thread from its ⋯ menu.
    </EmptyState>
  );
}
