"use server";

import { revalidatePath } from "next/cache";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type FormState = { ok: boolean; message: string; field?: "username" } | null;

const AFFILIATIONS: readonly string[] = [
  "student",
  "graduate",
  "postgrad",
  "resident",
] satisfies Enums<"affiliation">[];

// Mirrors the profiles_set_username() trigger so most mistakes are caught before the database.
const USERNAME = /^[a-z0-9_]{3,20}$/;
const USERNAME_FORMAT = "3–20 letters, numbers or underscores.";
const RESERVED_USERNAMES: readonly string[] = [
  "admin",
  "mod",
  "moderator",
  "support",
  "root",
  "system",
  "null",
  "me",
  "new",
  "settings",
];
const USERNAME_ERRORS = [
  ["username must be 3 to 20", USERNAME_FORMAT],
  ["username is reserved", "That username is reserved."],
  ["username is already taken", "That username is taken."],
  ["profiles_username_key", "That username is taken."],
] as const;

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
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
  const username = String(formData.get("username") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!USERNAME.test(username)) {
    return { ok: false, message: USERNAME_FORMAT, field: "username" };
  }
  if (RESERVED_USERNAMES.includes(username)) {
    return { ok: false, message: "That username is reserved.", field: "username" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      affiliation: rawAffiliation
        ? (rawAffiliation as Enums<"affiliation">)
        : null,
      username,
    })
    .eq("id", viewer.userId);
  if (error) {
    const raw = error.message ?? "";
    return {
      ok: false,
      message: friendlyError(error, { messages: USERNAME_ERRORS }),
      ...(USERNAME_ERRORS.some(([needle]) => raw.includes(needle)) && { field: "username" as const }),
    };
  }

  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function applyForModerator(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };
  if (isModerator(viewer.role))
    return { ok: false, message: "You are already a moderator." };

  const motivation = String(formData.get("motivation") ?? "").trim();
  if (motivation.length < 20 || motivation.length > 1000) {
    return { ok: false, message: "Motivation must be 20 to 1000 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("moderator_applications")
    .insert({ motivation });
  if (error) {
    return {
      ok: false,
      message: friendlyError(error, {
        codes: { "23505": "Your application is already being reviewed." },
      }),
    };
  }

  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { ok: true, message: "Application sent." };
}

export async function deleteAccount(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (String(formData.get("confirm") ?? "").trim() !== "DELETE") {
    return { ok: false, message: "Type DELETE to confirm." };
  }
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Sign in to delete your account." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_own_account");
  if (error) {
    return {
      ok: false,
      message: friendlyError(error, {
        messages: [
          [
            "last superadmin",
            "You are the last superadmin. Promote another superadmin before deleting your account.",
          ],
          ["not signed in", "Sign in to delete your account."],
          ["sign in", "Sign in to delete your account."],
        ],
      }),
    };
  }

  await supabase.auth.signOut();
  return { ok: true, message: "Your account was deleted." };
}
