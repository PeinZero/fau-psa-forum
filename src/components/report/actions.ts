"use server";

import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

const REPORT_ERRORS = {
  messages: [
    ["10 open reports", "You have 10 open reports. Please wait until moderators review them."],
    ["reports_one_open_per_target_idx", "You already reported this. Moderators will look at it."],
  ],
  codes: {
    "23505": "You already reported this. Moderators will look at it.",
    "42501": "This can't be reported.",
  },
} as const;

const targetSchema = z.union([
  z.strictObject({ threadId: z.number().int().positive() }),
  z.strictObject({ commentId: z.number().int().positive() }),
]);

const reportSchema = z.object({
  target: targetSchema,
  reason: z.enum(["spam", "offensive", "wrong_info", "personal_data", "other"]),
  details: z.string().trim().max(500, "Details can be at most 500 characters.").optional(),
});

export type ReportInput = {
  target: { threadId: number } | { commentId: number };
  reason: "spam" | "offensive" | "wrong_info" | "personal_data" | "other";
  details?: string;
};

export type ReportResult = { ok: true } | { ok: false; message: string };

export async function reportContent(input: ReportInput): Promise<ReportResult> {
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid request." };
  if (!(await getViewer())) return { ok: false, message: SIGN_IN_REQUIRED };
  const supabase = await createClient();

  const target =
    "threadId" in parsed.data.target
      ? { thread_id: parsed.data.target.threadId, comment_id: null }
      : { thread_id: null, comment_id: parsed.data.target.commentId };

  const { error } = await supabase.from("reports").insert({
    ...target,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });
  if (error) return { ok: false, message: friendlyError(error, REPORT_ERRORS) };
  return { ok: true };
}
