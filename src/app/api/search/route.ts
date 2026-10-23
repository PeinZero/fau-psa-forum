import type { NextRequest } from "next/server";

import { SEARCH_QUERY_MAX, type SearchResponse, type SearchThread } from "@/components/command/types";
import { createClient } from "@/lib/supabase/server";

const LIMIT = 8;
const TITLE_CANDIDATES = 24;

const threadSelect =
  "slug, title, city, category:categories!threads_category_id_fkey(slug, name), comments:comments!comments_thread_id_fkey(count)";

type ThreadRow = {
  slug: string;
  title: string;
  city: SearchThread["city"];
  category: SearchThread["category"];
  comments: { count: number }[];
};

// The cookie client keeps RLS as the single authority on visibility; the explicit status filter
// makes moderators get the same public answer as everyone else.
const headers = { "Cache-Control": "private, no-store" };

function toThread({ slug, title, city, category, comments }: ThreadRow): SearchThread {
  return { slug, title, city, category, commentCount: comments[0]?.count ?? 0 };
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Title starts with the query, then a word in it does, then any substring ("hal" finds "Halal"). */
function titleRank(title: string, needle: string): number {
  const lower = title.toLowerCase();
  if (lower.startsWith(needle)) return 0;
  if (new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(lower)) return 1;
  return 2;
}

async function search(q: string): Promise<SearchThread[]> {
  const supabase = await createClient();
  const [titles, fullText] = await Promise.all([
    supabase
      .from("threads")
      .select(threadSelect)
      .in("status", ["published", "archived"])
      .ilike("title", `%${escapeLike(q)}%`)
      .order("last_activity_at", { ascending: false })
      .limit(TITLE_CANDIDATES)
      .overrideTypes<ThreadRow[], { merge: false }>(),
    supabase
      .rpc("search_threads_v2", { q })
      .select(threadSelect)
      .limit(LIMIT)
      .overrideTypes<ThreadRow[], { merge: false }>(),
  ]);
  if (titles.error) throw titles.error;
  if (fullText.error) throw fullText.error;

  const needle = q.toLowerCase();
  const byTitle = titles.data
    .map((row, index) => ({ row, rank: titleRank(row.title, needle), index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ row }) => row);

  const seen = new Set<string>();
  return [...byTitle, ...fullText.data]
    .filter((row) => !seen.has(row.slug) && seen.add(row.slug))
    .slice(0, LIMIT)
    .map(toThread);
}

async function suggestions(): Promise<Omit<SearchResponse, "results">> {
  const supabase = await createClient();
  const [recent, categories] = await Promise.all([
    supabase
      .from("threads")
      .select(threadSelect)
      .eq("status", "published")
      .order("last_activity_at", { ascending: false })
      .limit(5)
      .overrideTypes<ThreadRow[], { merge: false }>(),
    supabase.from("categories").select("slug, name").order("sort_order").limit(6),
  ]);
  if (recent.error) throw recent.error;
  if (categories.error) throw categories.error;
  return { recent: recent.data.map(toThread), categories: categories.data };
}

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length > SEARCH_QUERY_MAX) {
    return Response.json({ error: `Search is limited to ${SEARCH_QUERY_MAX} characters.` }, { status: 400, headers });
  }

  try {
    const body: SearchResponse = q ? { results: await search(q) } : { results: [], ...(await suggestions()) };
    return Response.json(body, { headers });
  } catch (error) {
    console.error("search failed", error);
    return Response.json({ error: "Search failed." }, { status: 500, headers });
  }
}
