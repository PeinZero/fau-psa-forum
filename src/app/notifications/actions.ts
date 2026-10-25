"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

const notificationId = z.coerce.number().int().positive();

export async function markNotificationRead(id: number): Promise<ActionState> {
  const parsed = notificationId.safeParse(id);
  if (!parsed.success) return { ok: false, message: "Invalid notification." };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", parsed.data)
    .eq("recipient_id", viewer.userId)
    .is("read_at", null);
  if (error) return { ok: false, message: friendlyError(error) };

  // No revalidation: this runs while the visitor is already navigating to the target.
  return { ok: true, message: "Marked as read." };
}

export async function markAllNotificationsRead(): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) return { ok: false, message: friendlyError(error) };

  // The list on this page re-renders; the header bell refetches its own count when told.
  revalidatePath("/notifications");
  return { ok: true, message: "All notifications marked as read." };
}
