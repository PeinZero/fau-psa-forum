import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type Viewer = { userId: string; role: UserRole; displayName: string };

/**
 * The signed-in visitor with their profile role, cached per request; null for anonymous visitors.
 * Reads cookies, so callers must render inside <Suspense> (cacheComponents is on).
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  return { userId, role: profile.role, displayName: profile.display_name };
});
