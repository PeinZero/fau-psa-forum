"use server";

import { revalidatePath } from "next/cache";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type FormState = { ok: boolean; message: string } | null;

const AFFILIATIONS: readonly string[] = ["student", "graduate", "postgrad", "resident"] satisfies Enums<"affiliation">[];

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };

  const displayName = String(formData.get("display_name") ?? "").trim();
  const rawAffiliation = String(formData.get("affiliation") ?? "");
  if (displayName.length < 2 || displayName.length > 40) {
    return { ok: false, message: "Display name must be 2 to 40 characters." };
  }
  if (rawAffiliation && !AFFILIATIONS.includes(rawAffiliation)) {
    return { ok: false, message: "Choose one of the listed affiliations." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      affiliation: rawAffiliation ? (rawAffiliation as Enums<"affiliation">) : null,
    })
    .eq("id", viewer.userId);
  if (error) return { ok: false, message: friendlyError(error) };

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function applyForModerator(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };
  if (isModerator(viewer.role)) return { ok: false, message: "You are already a moderator." };

  const motivation = String(formData.get("motivation") ?? "").trim();
  if (motivation.length < 20 || motivation.length > 1000) {
    return { ok: false, message: "Motivation must be 20 to 1000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("moderator_applications").insert({ motivation });
  if (error) {
    return {
      ok: false,
      message: friendlyError(error, { codes: { "23505": "Your application is already being reviewed." } }),
    };
  }

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { ok: true, message: "Application sent." };
}
