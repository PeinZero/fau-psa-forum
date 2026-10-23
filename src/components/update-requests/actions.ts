"use server";

import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { firstIssue, friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

import { UPDATE_NOTE_MAX } from "./limits";

export type RequestUpdateInput = { threadId: number; note?: string };
export type RequestUpdateResult = { ok: true } | { ok: false; message: string };

const REQUEST_ERRORS = {
  messages: [
    ["already asked for an update", "You already asked for an update on this thread. Moderators will look at it."],
    ["update_requests_one_open", "You already asked for an update on this thread. Moderators will look at it."],
    ["5 open update requests", "You have 5 open update requests. Please wait until moderators have looked at them."],
    ["only be requested for published", "Updates can only be requested on published threads."],
  ],
  codes: {
    "23505": "You already asked for an update on this thread. Moderators will look at it.",
    "23503": "This thread no longer exists.",
    "42501": "You can't request an update on this thread.",
  },
} as const;

const requestSchema = z.strictObject({
  threadId: z.number().int().positive(),
  note: z.string().trim().max(UPDATE_NOTE_MAX, `The note can be at most ${UPDATE_NOTE_MAX} characters.`).optional(),
});

/** Asks moderators to re-check a thread whose details may have changed. */
export async function requestUpdate(input: RequestUpdateInput): Promise<RequestUpdateResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed) };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };

  const supabase = await createClient();
  const { error } = await supabase
    .from("update_requests")
    .insert({ thread_id: parsed.data.threadId, note: parsed.data.note || null });
  return error ? { ok: false, message: friendlyError(error, REQUEST_ERRORS) } : { ok: true };
}
