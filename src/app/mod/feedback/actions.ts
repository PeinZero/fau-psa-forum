"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/components/mod/actions";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

const feedbackId = z.object({ feedbackId: z.coerce.number().int().positive() });

async function requireModerator(): Promise<string | null> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN_REQUIRED;
  if (!isModerator(viewer.role)) return "Only moderators can do this.";
  return null;
}

// The counts feed the mod nav, the overview and the header badge.
function revalidateFeedback() {
  revalidatePath("/mod");
  revalidatePath("/mod/feedback");
  revalidatePath("/", "layout");
}

async function setHandled(formData: FormData, handled: boolean): Promise<ActionState> {
  const parsed = feedbackId.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const denied = await requireModerator();
  if (denied) return { ok: false, message: denied };

  const supabase = await createClient();
  // The database stamps the real time and the moderator; this only flips the state.
  const { data, error } = await supabase
    .from("feedback")
    .update({ handled_at: handled ? new Date().toISOString() : null })
    .eq("id", parsed.data.feedbackId)
    .select("id");
  if (error) return { ok: false, message: friendlyError(error) };
  if (!data?.length) return { ok: false, message: "Feedback not found, or you don't have permission." };

  revalidateFeedback();
  return { ok: true, message: handled ? "Marked as handled." : "Moved back to new." };
}

export async function markFeedbackHandled(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return setHandled(formData, true);
}

export async function markFeedbackNew(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return setHandled(formData, false);
}

export async function deleteFeedback(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = feedbackId.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const denied = await requireModerator();
  if (denied) return { ok: false, message: denied };

  const supabase = await createClient();
  const { data, error } = await supabase.from("feedback").delete().eq("id", parsed.data.feedbackId).select("id");
  if (error) return { ok: false, message: friendlyError(error) };
  if (!data?.length) return { ok: false, message: "Feedback not found, or you don't have permission." };

  revalidateFeedback();
  return { ok: true, message: "Feedback deleted." };
}
