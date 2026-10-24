"use server";

import { z } from "zod";

import { getUserId } from "@/lib/auth/viewer";
import { firstIssue, friendlyError } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

import { FEEDBACK_MESSAGE_MAX, FEEDBACK_MESSAGE_MIN, FEEDBACK_PAGE_MAX } from "./limits";

export type FeedbackResult = { ok: boolean; message: string };

const schema = z.object({
  message: z
    .string()
    .trim()
    .min(FEEDBACK_MESSAGE_MIN, `Please write at least ${FEEDBACK_MESSAGE_MIN} characters.`)
    .max(FEEDBACK_MESSAGE_MAX, `Please keep it under ${FEEDBACK_MESSAGE_MAX} characters.`),
  page: z.string().trim().max(FEEDBACK_PAGE_MAX).nullable(),
});

export async function sendFeedback(input: { message: string; page: string | null }): Promise<FeedbackResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed) };
  if (!(await getUserId())) return { ok: false, message: "Please sign in to send feedback." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .insert({ message: parsed.data.message, page: parsed.data.page || null });
  if (error) return { ok: false, message: friendlyError(error) };
  return { ok: true, message: "Thanks!" };
}
