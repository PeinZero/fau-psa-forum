import { createClient } from "@/lib/supabase/server";

export type SavedState = { bookmarked: boolean; following: boolean };

/** Whether the viewer bookmarked and follows this thread; RLS only ever returns their own rows. */
export async function getSavedState(userId: string, threadId: number): Promise<SavedState> {
  const supabase = await createClient();
  const [bookmark, follow] = await Promise.all([
    supabase.from("bookmarks").select("thread_id").eq("user_id", userId).eq("thread_id", threadId).maybeSingle(),
    supabase.from("thread_follows").select("thread_id").eq("user_id", userId).eq("thread_id", threadId).maybeSingle(),
  ]);
  return { bookmarked: Boolean(bookmark.data), following: Boolean(follow.data) };
}

/** Thread ids the viewer saved in one of the two lists, most recent first. */
export async function getSavedThreadIds(userId: string, list: "bookmarks" | "thread_follows") {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(list)
    .select("thread_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return { ids: (data ?? []).map((row) => row.thread_id), error };
}
