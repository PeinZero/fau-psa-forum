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
  const description = `Threads by ${profile.display_name} on the FAU PSA Forum.`;
  return {
    title,
    description,
    openGraph: { siteName: "FAU PSA Forum", title, description, url: `/u/${profile.username}` },
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
    <div className="flex flex-col gap-8">
      <header className="animate-fade-up flex items-start gap-4">
        <Avatar name={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-9">
            {profile.display_name}
          </h1>
          <p className="mt-0.5 break-all text-body text-muted">@{profile.username}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-meta text-muted">
            {profile.role !== "member" && (
              <Badge variant="accent">{profile.role === "superadmin" ? "Superadmin" : "Moderator"}</Badge>
            )}
            {profile.affiliation && <Badge>{affiliationLabels[profile.affiliation]}</Badge>}
            {isTopHelper(profile.best_answer_count) && <TopHelperBadge />}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden strokeWidth={1.75} className="size-3.5" />
              Joined <time dateTime={profile.created_at}>{formatDate(profile.created_at)}</time>
            </span>
          </div>
        </div>
      </header>

      <dl className="animate-fade-up grid grid-cols-2 gap-3" style={{ "--i": 1 } as React.CSSProperties}>
        <Stat icon={<Sparkles aria-hidden strokeWidth={1.75} />} label="Reputation" value={profile.reputation} />
        <Stat
          icon={<MessageSquareCheck aria-hidden strokeWidth={1.75} />}
          label="Best answers"
          value={profile.best_answer_count}
        />
      </dl>

      <section aria-labelledby="profile-threads" className="flex flex-col gap-3">
        <h2 id="profile-threads" className="text-base font-semibold tracking-tight">
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <span aria-hidden className="text-accent [&_svg]:size-4">
        {icon}
      </span>
      <div>
        <dd className="text-lg font-semibold tabular-nums leading-tight tracking-tight">{value}</dd>
        <dt className="text-meta text-muted">{label}</dt>
      </div>
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
      <p role="alert" className="text-sm text-danger">
        Could not load threads. Please try again later.
      </p>
    );
  }

  const threads = await fetchThreadsByIds(data.map((row) => row.id));
  return (
    <>
      <ThreadList
        threads={threads}
        emptyText={`${name} has not published any threads yet.`}
        emptyDescription="Threads appear here once a moderator has approved them."
        emptyAction={null}
      />
      <Pagination path={`/u/${username}`} page={page} total={count ?? 0} />
    </>
  );
}

function ProfileSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-8">
      <span className="sr-only">Loading profile…</span>
      <div className="flex items-start gap-4">
        <Skeleton className="size-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-56" />
        </div>
      </div>
      <ThreadListSkeleton rows={3} />
    </div>
  );
}
