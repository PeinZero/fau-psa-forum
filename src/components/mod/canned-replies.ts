import "server-only";

import type { ReasonPreset } from "@/components/ui/reason-field";
import { createClient } from "@/lib/supabase/server";

/** Rejection starting points for the reject dialogs; RLS returns nothing to non-moderators. */
export async function getCannedReplies(): Promise<ReasonPreset[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("canned_replies").select("label, body").order("sort_order").order("id");
  return data ?? [];
}
