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
         id, parent_id, body, created_at, edited_at, hidden_at, author_id,
         author:profiles!comments_author_id_fkey(display_name, username, affiliation, role)
       )`,
    )
    .eq("slug", slug)
    .order("created_at", { referencedTable: "comments", ascending: true })
    .maybeSingle();
  return data;
});

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
