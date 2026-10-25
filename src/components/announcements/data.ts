import "server-only";

import { cache } from "react";

import { PAGE_SIZE } from "@/components/ui/pagination";
import { createClient } from "@/lib/supabase/server";

export const announcementSelect = `
  id, title, body, is_pinned, created_at, updated_at,
  author:profiles!announcements_author_id_fkey(display_name, username, affiliation, role)
`;

/** Pinned first, then newest first. Reads cookies, so render inside <Suspense>. */
export async function fetchAnnouncements() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select(announcementSelect)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });
  return { announcements: data ?? [], error };
}

export type Announcement = Awaited<ReturnType<typeof fetchAnnouncements>>["announcements"][number];

export function announcementHref(id: number): string {
  return `/announcements/${id}`;
}

export const fetchAnnouncement = cache(async (id: number) => {
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select(announcementSelect).eq("id", id).maybeSingle();
  return data;
});

export const SEARCH_MAX = 100;

/** Quoted so commas and parentheses in the search stay part of the value in a PostgREST `or` filter. */
function orPattern(q: string): string {
  const like = q.replace(/[\\%_]/g, "\\$&");
  return `"%${like.replace(/[\\"]/g, "\\$&")}%"`;
}

/** Pinned first, then newest; `q` is a case-insensitive substring match over title or body. */
export async function searchAnnouncements({ q = "", page = 1 }: { q?: string; page?: number } = {}) {
  const term = q.trim().slice(0, SEARCH_MAX);
  const from = (Math.max(1, page) - 1) * PAGE_SIZE;
  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select(announcementSelect, { count: "exact" })
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (term) {
    const pattern = orPattern(term);
    query = query.or(`title.ilike.${pattern},body.ilike.${pattern}`);
  }
  const { data, count, error } = await query;
  return { announcements: data ?? [], total: count ?? 0, error };
}
