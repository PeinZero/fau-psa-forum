"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { ActionState } from "@/components/mod/actions";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export async function deleteFeedback(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ feedbackId: z.coerce.number().int().positive() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };
  if (!isModerator(viewer.role)) return { ok: false, message: "Only moderators can do this." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("feedback").delete().eq("id", parsed.data.feedbackId).select("id");
  if (error) return { ok: false, message: friendlyError(error) };
  if (!data?.length) return { ok: false, message: "Feedback not found, or you don't have permission." };

  revalidatePath("/mod/feedback");
  return { ok: true, message: "Feedback deleted." };
}
