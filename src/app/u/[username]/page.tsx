import { CalendarDays, MessageSquareCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { Avatar } from "@/components/author";
import { fetchThreadsByIds, ThreadList, ThreadListSkeleton } from "@/components/thread/thread-list";
import { isTopHelper, TopHelperBadge } from "@/components/reputation/reputation";
import { Badge } from "@/components/ui/badge";
import { PAGE_SIZE, Pagination, parsePage } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { affiliationLabels, formatDate } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ username: string }>;
type SearchParams = Promise<{ page?: string | string[] }>;

const HANDLE = /^[a-z0-9_]{3,20}$/;

/** Handles are stored lowercase, so /u/Ayesha_Khan finds @ayesha_khan. */
const getProfile = cache(async (rawHandle: string) => {
  const handle = rawHandle.trim().toLowerCase();
  if (!HANDLE.test(handle)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, username, affiliation, role, created_at, reputation, best_answer_count")
    .eq("username", handle)
    .maybeSingle();
  return data;
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return { title: "User not found" };
  const title = `${profile.display_name} (@${profile.username})`;
  const description = `Threads by ${profile.display_name} on the PSA FAU Community Forum.`;
  return {
    title,
    description,
    openGraph: { siteName: "PSA FAU Community Forum", title, description, url: `/u/${profile.username}` },
  };
}

export default function ProfilePage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Suspense fallback={<ProfileSkeleton />}>
        <ProfileContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ProfileContent({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();

  return (
    <div className="flex flex-col gap-10">
      <header className="animate-fade-up flex items-start gap-4 sm:gap-5">
        <Avatar name={profile.display_name} size="lg" className="sm:size-16 sm:text-xl" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-display font-semibold tracking-tight text-foreground">
            {profile.display_name}
          </h1>
          <p className="break-all text-body text-muted">@{profile.username}</p>
          {(profile.role !== "member" || profile.affiliation || isTopHelper(profile.best_answer_count)) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {profile.role !== "member" && (
                <Badge variant="accent">{profile.role === "superadmin" ? "Superadmin" : "Moderator"}</Badge>
              )}
              {profile.affiliation && <Badge>{affiliationLabels[profile.affiliation]}</Badge>}
              {isTopHelper(profile.best_answer_count) && <TopHelperBadge />}
            </div>
          )}
          <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-meta text-muted">
            <Stat icon={<Sparkles />} label="Reputation" value={profile.reputation} />
            <Stat icon={<MessageSquareCheck />} label="Best answers" value={profile.best_answer_count} />
            <div className="flex items-center gap-1.5">
              <CalendarDays aria-hidden strokeWidth={1.75} className="size-4 text-subtle" />
              <dt className="sr-only">Joined</dt>
              <dd>
                Joined <time dateTime={profile.created_at} className="tabular-nums">{formatDate(profile.created_at)}</time>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <section aria-labelledby="profile-threads" className="animate-fade-up" style={{ "--i": 1 } as React.CSSProperties}>
        <h2 id="profile-threads" className="mb-2 text-heading font-semibold text-foreground">
          Threads
        </h2>
        <Suspense fallback={<ThreadListSkeleton rows={3} />}>
          <ProfileThreads
            userId={profile.id}
            username={profile.username}
            name={profile.display_name}
            searchParams={searchParams}
          />
        </Suspense>
      </section>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden className="text-subtle [&_svg]:size-4 [&_svg]:stroke-[1.75]">
        {icon}
      </span>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
      <dt>{label}</dt>
    </div>
  );
}

async function ProfileThreads({
  userId,
  username,
  name,
  searchParams,
}: {
  userId: string;
  username: string;
  name: string;
  searchParams: SearchParams;
}) {
  const [supabase, { page: pageParam }] = await Promise.all([createClient(), searchParams]);
  const page = parsePage(pageParam);
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await supabase
    .from("threads")
    .select("id", { count: "exact" })
    .eq("author_id", userId)
    .eq("status", "published")
    .order("last_activity_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (error) {
    return (
      <p role="alert" className="text-body text-danger">
        Could not load threads. Please try again later.
      </p>
    );
  }

  const threads = await fetchThreadsByIds(data.map((row) => row.id));
  return (
    <>
      <ThreadList
        threads={threads}
        hideAuthor
        emptyText={`${name} has no published threads yet`}
        emptyDescription="Threads appear here once a moderator has approved them."
        emptyAction={null}
      />
      <Pagination path={`/u/${username}`} page={page} total={count ?? 0} />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-10">
      <span className="sr-only">Loading profile…</span>
      <div className="flex items-start gap-4 sm:gap-5">
        <Skeleton className="size-14 rounded-full sm:size-16" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-9 w-56 max-w-full" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-4 h-5 w-64 max-w-full" />
        </div>
      </div>
      <div>
        <Skeleton className="mb-2 h-6 w-20" />
        <ThreadListSkeleton rows={3} />
      </div>
    </div>
  );
}
