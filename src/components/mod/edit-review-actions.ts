"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getViewer, isModerator } from "@/lib/auth/viewer";
import { friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

import type { ActionState } from "./actions";

const fail = (message: string): ActionState => ({ ok: false, message });

function done(message: string): ActionState {
  revalidatePath("/mod/edits");
  revalidatePath("/mod");
  // The header badge counts open moderation work on every page.
  revalidatePath("/", "layout");
  return { ok: true, message };
}

async function moderatorDenied(): Promise<string | null> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN_REQUIRED;
  return isModerator(viewer.role) ? null : "Only moderators can do this.";
}

const id = z.coerce.number().int().positive();

const reviewSchema = z.object({
  // One thread card can stand for several revisions of that thread.
  revisionIds: z
    .string()
    .transform((value) => value.split(",").map(Number))
    .pipe(z.array(z.number().int().positive()).min(1).max(500)),
  op: z.enum(["review", "unreview"]),
});

export async function setRevisionsReviewed(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");
  const { revisionIds, op } = parsed.data;

  const denied = await moderatorDenied();
  if (denied) return fail(denied);

  const supabase = await createClient();
  const query = supabase
    .from("thread_revisions")
    .update({ reviewed_at: op === "review" ? new Date().toISOString() : null })
    .in("id", revisionIds);
  const { data, error } = await (op === "review" ? query.is("reviewed_at", null) : query.not("reviewed_at", "is", null)).select(
    "id",
  );
  if (error) return fail(friendlyError(error));
  if (!data.length) return done("Already done by another moderator.");
  return done(op === "review" ? "Marked as reviewed." : "Moved back to review.");
}

// Bounded by the newest revision the moderator saw, so an edit arriving meanwhile stays in the queue.
const reviewAllSchema = z.object({ upTo: id });

export async function markAllRevisionsReviewed(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reviewAllSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");

  const denied = await moderatorDenied();
  if (denied) return fail(denied);

  const supabase = await createClient();
  const { error } = await supabase
    .from("thread_revisions")
    .update({ reviewed_at: new Date().toISOString() })
    .is("reviewed_at", null)
    .lte("id", parsed.data.upTo);
  if (error) return fail(friendlyError(error));
  return done("All edits marked as reviewed.");
}
