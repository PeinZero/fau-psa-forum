import "server-only";

import { fetchBrowseThreads } from "@/components/thread/thread-list";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

import { fillPopular, MODERATOR_AVATARS, POPULAR_LIMIT } from "./shape";

export async function fetchPopularQuestions() {
  const hot = await fetchBrowseThreads({ sort: "hot", limit: POPULAR_LIMIT });
  if (hot.length >= POPULAR_LIMIT) return hot;
  const newest = await fetchBrowseThreads({ sort: "new", limit: POPULAR_LIMIT });
  return fillPopular(hot, newest);
}

/** A few moderators' faces and how many there are in all, plus whether the visitor is signed in. */
export async function fetchCommunity() {
  const supabase = await createClient();
  const [{ data, count }, viewer] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name", { count: "exact" })
      .in("role", ["moderator", "superadmin"])
      .order("display_name")
      .limit(MODERATOR_AVATARS),
    getViewer(),
  ]);
  const moderators = data ?? [];
  return { moderators, total: count ?? moderators.length, signedIn: viewer !== null };
}
