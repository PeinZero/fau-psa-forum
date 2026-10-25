import "server-only";

import { cacheLife } from "next/cache";

import { fetchDoneStepIds } from "@/components/guides/data";
import { getUserId } from "@/lib/auth/viewer";
import { createAnonClient } from "@/lib/supabase/anon";

import type { CommunityModerator } from "./community-strip";
import type { PopularQuestion } from "./popular-questions";
import {
  countDone,
  fillPopular,
  type HomeGuide,
  type HomeTopic,
  MODERATOR_AVATARS,
  orderByIds,
  POPULAR_LIMIT,
  START_HERE_LIMIT,
  toHomeGuides,
  toTopics,
} from "./shape";

// Everything Home shows is public, so it is read as a signed-out visitor and cached for all of them.
// That puts the sections into the prerendered page; "minutes" keeps them at most a minute or so behind.

export async function getHomeGuides(): Promise<HomeGuide[]> {
  "use cache";
  cacheLife("minutes");
  const { data } = await createAnonClient()
    .from("guides")
    .select("id, slug, title, summary, guide_steps(id)")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(START_HERE_LIMIT);
  return toHomeGuides(data ?? []);
}

export async function getHomeTopics(): Promise<HomeTopic[]> {
  "use cache";
  cacheLife("minutes");
  const { data } = await createAnonClient()
    .from("categories")
    .select("id, slug, name, description, threads:threads!threads_category_id_fkey(count)")
    .eq("threads.status", "published")
    .order("sort_order")
    .order("name");
  return toTopics(data ?? []);
}

async function rankedIds(sort: "hot" | "new"): Promise<{ id: number }[]> {
  const { data } = await createAnonClient()
    .rpc("browse_threads", { p_sort: sort, p_limit: POPULAR_LIMIT, p_offset: 0 })
    .select("id");
  return data ?? [];
}

export async function getPopularQuestions(): Promise<PopularQuestion[]> {
  "use cache";
  cacheLife("minutes");
  const hot = await rankedIds("hot");
  const ids = (hot.length >= POPULAR_LIMIT ? hot : fillPopular(hot, await rankedIds("new"))).map((row) => row.id);
  if (ids.length === 0) return [];
  const { data } = await createAnonClient()
    .from("threads")
    .select("id, slug, title, comment_count, best_comment_id, category:categories!threads_category_id_fkey(slug, name)")
    .in("id", ids);
  return orderByIds(ids, data ?? []);
}

/** A few moderators' faces and how many there are in all. */
export async function getHomeModerators(): Promise<{ moderators: CommunityModerator[]; total: number }> {
  "use cache";
  cacheLife("minutes");
  const { data, count } = await createAnonClient()
    .from("profiles")
    .select("id, display_name", { count: "exact" })
    .in("role", ["moderator", "superadmin"])
    .order("display_name")
    .limit(MODERATOR_AVATARS);
  const moderators = data ?? [];
  return { moderators, total: count ?? moderators.length };
}

/** The only per-visitor reads on Home; both read the session, so they render inside <Suspense>. */
export async function isSignedIn(): Promise<boolean> {
  return (await getUserId()) !== null;
}

/** Null for signed-out visitors, whose progress lives in their browser. */
export async function getDoneCount(stepIds: number[]): Promise<number | null> {
  const userId = await getUserId();
  if (!userId) return null;
  return countDone(stepIds, await fetchDoneStepIds(userId, stepIds));
}
