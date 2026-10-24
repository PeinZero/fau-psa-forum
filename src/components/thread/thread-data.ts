import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

/** One thread with its category, author and comments; RLS decides what the visitor may see. */
export const getThread = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("threads")
    .select(
      `*,
       category:categories!threads_category_id_fkey(slug, name),
       author:profiles!threads_author_id_fkey(display_name, username, affiliation, role),
       comments:comments!comments_thread_id_fkey(
         id, parent_id, body, created_at, edited_at, hidden_at, author_id, score,
         author:profiles!comments_author_id_fkey(display_name, username, affiliation, role)
       )`,
    )
    .eq("slug", slug)
    .order("created_at", { referencedTable: "comments", ascending: true })
    .maybeSingle();
  return data;
});

export type MyVote = -1 | 0 | 1;

/** The viewer's own votes on these comments; RLS never returns anyone else's. */
export async function getMyVotes(userId: string, commentIds: number[]): Promise<Map<number, MyVote>> {
  if (commentIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase
    .from("comment_votes")
    .select("comment_id, value")
    .eq("user_id", userId)
    .in("comment_id", commentIds);
  return new Map((data ?? []).map((vote) => [vote.comment_id, vote.value > 0 ? 1 : -1]));
}

/** The viewer's own vote on a thread, 0 when there is none. */
export async function getMyThreadVote(userId: string, threadId: number): Promise<MyVote> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("thread_votes")
    .select("value")
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .maybeSingle();
  return data ? (data.value > 0 ? 1 : -1) : 0;
}

export type CommentSort = "top" | "new";

export function parseCommentSort(value: string | string[] | undefined): CommentSort {
  return value === "new" ? "new" : "top";
}

export type ThreadDetail = NonNullable<Awaited<ReturnType<typeof getThread>>>;
export type CommentDetail = ThreadDetail["comments"][number];

/** Rough plain-text preview of markdown for link previews. */
export function plainTextExcerpt(markdown: string, max = 160): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, "")
    .replace(/[*_`~|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}
