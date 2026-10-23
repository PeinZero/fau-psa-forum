import "server-only";

import { createClient } from "@/lib/supabase/server";

export const announcementSelect = `
  id, title, body, is_pinned, created_at, updated_at,
  author:profiles!announcements_author_id_fkey(display_name, affiliation, role)
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
  return `/announcements#announcement-${id}`;
}
