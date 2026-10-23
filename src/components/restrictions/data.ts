import "server-only";

import type { UserRole, Viewer } from "@/lib/auth/viewer";
import { activeRestrictions, type Restriction } from "@/lib/restrictions";
import { createClient } from "@/lib/supabase/server";

const FIELDS = "id, user_id, kind, reason, expires_at, lifted_at";

/** Active restrictions per user, for moderator lists; RLS limits members to their own rows. */
export async function getActiveRestrictions(userIds: readonly string[]): Promise<Map<string, Restriction[]>> {
  const byUser = new Map<string, Restriction[]>();
  if (userIds.length === 0) return byUser;
  const supabase = await createClient();
  const { data } = await supabase.from("user_restrictions").select(FIELDS).in("user_id", userIds).is("lifted_at", null);
  const now = Date.now();
  for (const row of activeRestrictions(data ?? [], now)) {
    byUser.set(row.user_id, [...(byUser.get(row.user_id) ?? []), row]);
  }
  return byUser;
}

/** The restriction that currently limits this user, ban before mute; null when they may post. */
export async function getOwnRestriction(userId: string): Promise<Restriction | null> {
  return (await getActiveRestrictions([userId])).get(userId)?.[0] ?? null;
}

/** Mirrors restrict_user(): never yourself or a superadmin, staff only by a superadmin. */
export function canRestrict(viewer: Viewer, target: { id: string; role: UserRole }): boolean {
  if (target.id === viewer.userId || target.role === "superadmin") return false;
  return target.role === "member" || viewer.role === "superadmin";
}
