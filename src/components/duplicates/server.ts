import "server-only";

import { SEARCH_QUERY_MAX } from "@/components/command/types";
import { createClient } from "@/lib/supabase/server";

import type { SimilarThread } from "./types";

const select =
  "slug, title, best_comment_id, category:categories!threads_category_id_fkey(slug, name), city, comments:comments!comments_thread_id_fkey(count)";

type Row = {
  slug: string;
  title: string;
  best_comment_id: number | null;
  city: SimilarThread["city"];
  category: SimilarThread["category"];
  comments: { count: number }[];
};

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Published threads that look like `title`: exact title substring first, then full-text matches. */
export async function findSimilarThreads(title: string, limit = 3): Promise<SimilarThread[]> {
  const q = title.trim().slice(0, SEARCH_QUERY_MAX);
  if (!q) return [];
  const supabase = await createClient();
  const [titles, fullText] = await Promise.all([
    supabase
      .from("threads")
      .select(select)
      .eq("status", "published")
      .ilike("title", `%${escapeLike(q)}%`)
      .order("last_activity_at", { ascending: false })
      .limit(limit)
      .overrideTypes<Row[], { merge: false }>(),
    supabase
      .rpc("search_threads", { q })
      .select(select)
      .eq("status", "published")
      .limit(limit)
      .overrideTypes<Row[], { merge: false }>(),
  ]);
  // Suggestions are a convenience for moderators; a failed lookup must not break the review queue.
  if (titles.error || fullText.error) {
    console.error("duplicate lookup failed", titles.error ?? fullText.error);
    return [];
  }

  const seen = new Set<string>();
  return [...titles.data, ...fullText.data]
    .filter((row) => !seen.has(row.slug) && seen.add(row.slug))
    .slice(0, limit)
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      city: row.city,
      category: row.category,
      commentCount: row.comments[0]?.count ?? 0,
      hasBestAnswer: row.best_comment_id !== null,
    }));
}
