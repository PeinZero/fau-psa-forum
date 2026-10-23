"use server";

import { z } from "zod";

import { ALL_NOTIFICATION_TYPES, EMAIL_FREQUENCIES } from "@/components/notification-settings/types";
import { getViewer } from "@/lib/auth/viewer";
import { friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";

export type PreferencesResult = { ok: boolean; message: string };

const preferences = z.object({
  mutedTypes: z.array(z.enum(ALL_NOTIFICATION_TYPES as [string, ...string[]])).max(ALL_NOTIFICATION_TYPES.length),
  emailFrequency: z.enum(EMAIL_FREQUENCIES),
});

export async function savePreferences(input: unknown): Promise<PreferencesResult> {
  const parsed = preferences.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Some of your choices are not valid." };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };

  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: viewer.userId,
      muted_types: [...new Set(parsed.data.mutedTypes)] as Enums<"notification_type">[],
      email_frequency: parsed.data.emailFrequency,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, message: friendlyError(error) };
  return { ok: true, message: "Saved." };
}
