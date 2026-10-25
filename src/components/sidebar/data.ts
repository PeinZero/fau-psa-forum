import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { mergeLatestAnnouncements } from "./announcements";

const RECENT_LIMIT = 2;
const select = "id, title, body, is_pinned, created_at";

/** The newest pinned announcement, then the most recent others; shared by the sidebar and the phone strip. */
export const fetchLatestAnnouncements = cache(async () => {
  const supabase = await createClient();
  const [pinned, recent] = await Promise.all([
    supabase.from("announcements").select(select).eq("is_pinned", true).order("created_at", { ascending: false }).limit(1),
    supabase.from("announcements").select(select).order("created_at", { ascending: false }).limit(RECENT_LIMIT + 1),
  ]);
  return {
    items: mergeLatestAnnouncements(pinned.data?.[0], recent.data ?? [], RECENT_LIMIT),
    fetchedAt: Date.now(),
  };
});
