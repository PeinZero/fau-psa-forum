"use server";

import { createClient } from "@/lib/supabase/server";

/** Returns false for signed-out visitors, whose "seen" marker lives in their browser instead. */
export async function markAnnouncementsSeen(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return false;

  const { error } = await supabase
    .from("profiles")
    .update({ announcements_seen_at: new Date().toISOString() })
    .eq("id", userId);
  return !error;
}
