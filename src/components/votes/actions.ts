"use server";

import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { firstIssue, friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type VoteValue = -1 | 0 | 1;

export type CastVoteInput = { commentId: number; value: VoteValue };

export type CastVoteResult = { ok: true; score: number; myVote: VoteValue } | { ok: false; message: string };

const VOTE_ERRORS = {
  messages: [
    ["you cannot vote on your own comment", "You can't vote on your own comment."],
    ["voting is only possible on visible comments of published threads", "Voting is closed for this comment."],
    ["row-level security", "You can't vote on this comment."],
  ],
  codes: {
    "42501": "You can't vote on this comment.",
    "23503": "This comment no longer exists.",
  },
} as const;

const castVoteSchema = z.strictObject({
  commentId: z.number().int().positive(),
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
});

/**
 * Casts, changes (value ±1) or withdraws (value 0) the viewer's vote and returns the comment's
 * new score, so the control can settle on the server's number without re-rendering the thread.
 */
export async function castVote(input: CastVoteInput): Promise<CastVoteResult> {
  const parsed = castVoteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: firstIssue(parsed) };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: SIGN_IN_REQUIRED };
  const { commentId, value } = parsed.data;
  const supabase = await createClient();

  const { error } =
    value === 0
      ? await supabase.from("comment_votes").delete().eq("comment_id", commentId).eq("user_id", viewer.userId)
      : await supabase
          .from("comment_votes")
          .upsert({ comment_id: commentId, value }, { onConflict: "comment_id,user_id" });
  if (error) return { ok: false, message: friendlyError(error, VOTE_ERRORS) };

  const { data } = await supabase.from("comments").select("score").eq("id", commentId).maybeSingle();
  if (!data) return { ok: false, message: "This comment no longer exists." };
  return { ok: true, score: data.score, myVote: value };
}
