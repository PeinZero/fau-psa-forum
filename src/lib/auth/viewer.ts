import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type Viewer = { userId: string; role: UserRole; displayName: string };

export function isModerator(role: UserRole): boolean {
  return role === "moderator" || role === "superadmin";
}

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

export const VIEW_AS_MEMBER_COOKIE = "view_as_member";

export type ViewMode = "member" | "default";

/** Whether a moderator chose to see pages as a member would; reads cookies, so render inside <Suspense>. */
export async function getViewMode(): Promise<ViewMode> {
  const store = await cookies();
  return store.get(VIEW_AS_MEMBER_COOKIE)?.value === "1" ? "member" : "default";
}

/**
 * The viewer as pages should render them: a moderator viewing as a member gets the member role.
 * Purely visual; server actions and RLS keep checking the real role.
 */
export const getEffectiveViewer = cache(async (): Promise<Viewer | null> => {
  const viewer = await getViewer();
  if (!viewer || !isModerator(viewer.role)) return viewer;
  return (await getViewMode()) === "member" ? { ...viewer, role: "member" } : viewer;
});
