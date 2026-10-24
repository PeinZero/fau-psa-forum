"use server";

import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { firstIssue, friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

import type { CastVoteResult, VoteValue } from "./actions";

export type CastThreadVoteInput = { threadId: number; value: VoteValue };

const THREAD_VOTE_ERRORS = {
  messages: [
    ["own thread", "You can't vote on your own thread."],
    ["published threads", "Voting is closed for this thread."],
    ["row-level security", "You can't vote on this thread."],
  ],
  codes: {
    "42501": "You can't vote on this thread.",
    "23503": "This thread no longer exists.",
  },
} as const;

const castThreadVoteSchema = z.strictObject({
  threadId: z.number().int().positive(),
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

/** Casts, changes (±1) or withdraws (0) the viewer's vote on a thread and returns its new score. */
export async function castThreadVote(input: CastThreadVoteInput): Promise<CastVoteResult> {
  const parsed = castThreadVoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed) };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };
  const { threadId, value } = parsed.data;
  const supabase = await createClient();

  const { error } =
    value === 0
      ? await supabase.from("thread_votes").delete().eq("thread_id", threadId).eq("user_id", viewer.userId)
      : await supabase.from("thread_votes").upsert({ thread_id: threadId, value }, { onConflict: "thread_id,user_id" });
  if (error) return { ok: false, message: friendlyError(error, THREAD_VOTE_ERRORS) };

  const { data } = await supabase.from("threads").select("score").eq("id", threadId).maybeSingle();
  if (!data) return { ok: false, message: "This thread no longer exists." };
  return { ok: true, score: data.score, myVote: value };
}
