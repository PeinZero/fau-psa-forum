"use server";

import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { firstIssue, friendlyError, type PgError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type SaveInput = { threadId: number; on: boolean };
export type SaveResult = { ok: true } | { ok: false; message: string };

const SAVE_ERRORS = {
  codes: {
    "42501": "You can't save this thread.",
    "23503": "This thread no longer exists.",
  },
} as const;

// Already saved (unique violation) is the state the viewer asked for.
function result(error: PgError | null): SaveResult {
  if (!error || error.code === "23505") return { ok: true };
  return { ok: false, message: friendlyError(error, SAVE_ERRORS) };
}

const saveSchema = z.strictObject({ threadId: z.number().int().positive(), on: z.boolean() });

/** Adds or removes the viewer's bookmark; repeating either direction is harmless. */
export async function setBookmark(input: SaveInput): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed) };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };
  const { threadId, on } = parsed.data;
  const supabase = await createClient();

  const { error } = on
    ? await supabase.from("bookmarks").insert({ thread_id: threadId })
    : await supabase.from("bookmarks").delete().eq("user_id", viewer.userId).eq("thread_id", threadId);
  return result(error);
}

/** Starts or stops following; following delivers bell notifications for new answers. */
export async function setFollow(input: SaveInput): Promise<SaveResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed) };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };
  const { threadId, on } = parsed.data;
  const supabase = await createClient();

  const { error } = on
    ? await supabase.from("thread_follows").insert({ thread_id: threadId })
    : await supabase.from("thread_follows").delete().eq("user_id", viewer.userId).eq("thread_id", threadId);
  return result(error);
}
