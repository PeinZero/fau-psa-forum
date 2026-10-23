"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer, isModerator } from "@/lib/auth/viewer";
import { firstIssue, friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

import {
  GUIDE_SLUG_MAX,
  GUIDE_SLUG_PATTERN,
  GUIDE_STEPS_MAX,
  GUIDE_SUMMARY_MAX,
  GUIDE_TITLE_MAX,
  GUIDE_TITLE_MIN,
  STEP_BODY_MAX,
  STEP_TITLE_MAX,
  STEP_TITLE_MIN,
} from "./limits";

export type ActionState = { ok: boolean; message: string } | null;

const fail = (message: string): ActionState => ({ ok: false, message });

const GUIDE_ERRORS = { messages: [["guides_slug_key", "Another guide already uses this address."]] } as const;

const id = z.coerce.number().int().positive();

export async function setGuideStepDone(stepId: number, done: boolean): Promise<ActionState> {
  const parsed = z.object({ stepId: id, done: z.boolean() }).safeParse({ stepId, done });
  if (!parsed.success) return fail("Invalid request.");
  const viewer = await getViewer();
  if (!viewer) return fail(SIGN_IN_REQUIRED);

  const supabase = await createClient();
  const { error } = done
    ? await supabase.from("guide_progress").insert({ step_id: parsed.data.stepId })
    : await supabase.from("guide_progress").delete().eq("user_id", viewer.userId).eq("step_id", parsed.data.stepId);
  // Ticking a step twice (two tabs) is not an error.
  if (error && error.code !== "23505") return fail(friendlyError(error));
  revalidateProgress();
  return { ok: true, message: done ? "Step marked done." : "Step marked not done." };
}

/** Moves progress ticked while signed out into the account, so it follows the member across devices. */
export async function importGuideProgress(stepIds: number[]): Promise<ActionState> {
  const parsed = z.array(id).max(GUIDE_STEPS_MAX).safeParse(stepIds);
  if (!parsed.success) return fail("Invalid request.");
  const viewer = await getViewer();
  if (!viewer) return fail(SIGN_IN_REQUIRED);
  if (parsed.data.length === 0) return { ok: true, message: "" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("guide_progress")
    .upsert(
      parsed.data.map((stepId) => ({ step_id: stepId })),
      { onConflict: "user_id,step_id", ignoreDuplicates: true },
    );
  if (error) return fail(friendlyError(error));
  revalidateProgress();
  return { ok: true, message: "Progress synced to your account." };
}

/** Progress shows on the guide itself (re-rendered as the current page), the guide list and the home page. */
function revalidateProgress() {
  revalidatePath("/guides");
  revalidatePath("/");
}

async function requireModerator(): Promise<string | null> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN_REQUIRED;
  if (!isModerator(viewer.role)) return "Only moderators can do this.";
  return null;
}

const stepSchema = z.object({
  key: z.string().max(100),
  id: id.nullable(),
  title: z
    .string()
    .trim()
    .min(STEP_TITLE_MIN, `Every step needs a title of at least ${STEP_TITLE_MIN} characters.`)
    .max(STEP_TITLE_MAX, `Step titles can be at most ${STEP_TITLE_MAX} characters.`),
  body: z.string().trim().max(STEP_BODY_MAX, `Step texts can be at most ${STEP_BODY_MAX} characters.`),
  threadSlug: z.string().nullable(),
});

const guideSchema = z.object({
  guideId: id.optional(),
  title: z
    .string()
    .trim()
    .min(GUIDE_TITLE_MIN, `The title needs at least ${GUIDE_TITLE_MIN} characters.`)
    .max(GUIDE_TITLE_MAX, `The title can be at most ${GUIDE_TITLE_MAX} characters.`),
  slug: z
    .string()
    .trim()
    .max(GUIDE_SLUG_MAX, `The address can be at most ${GUIDE_SLUG_MAX} characters.`)
    .regex(GUIDE_SLUG_PATTERN, "The address may only use lowercase letters, digits and single dashes."),
  summary: z.string().trim().max(GUIDE_SUMMARY_MAX, `The summary can be at most ${GUIDE_SUMMARY_MAX} characters.`),
  sortOrder: z.coerce.number().int().min(-1000).max(1000).default(0),
  isFeatured: z.literal("on").optional(),
  steps: z
    .string()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid steps." });
        return z.NEVER;
      }
    })
    .pipe(
      z
        .array(stepSchema)
        .min(1, "Add at least one step.")
        .max(GUIDE_STEPS_MAX, `A guide can have at most ${GUIDE_STEPS_MAX} steps.`),
    ),
});

// Positions are unique per guide, so kept steps park out of the way before taking their new place.
const PARKED_POSITION = 1_000_000;

/** `savedSteps` tells the editor which database row each of its draft steps became. */
export type SaveGuideState = { ok: boolean; message: string; savedSteps?: { key: string; id: number }[] } | null;

export async function saveGuide(_prev: SaveGuideState, formData: FormData): Promise<SaveGuideState> {
  const parsed = guideSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed));
  const { guideId, title, slug, summary, sortOrder, isFeatured, steps } = parsed.data;

  const denied = await requireModerator();
  if (denied) return fail(denied);

  const supabase = await createClient();

  const slugs = [...new Set(steps.flatMap((step) => (step.threadSlug ? [step.threadSlug] : [])))];
  const threadIds = new Map<string, number>();
  if (slugs.length > 0) {
    const { data, error } = await supabase.from("threads").select("id, slug").in("slug", slugs);
    if (error) return fail(friendlyError(error));
    for (const thread of data) threadIds.set(thread.slug, thread.id);
    if (threadIds.size !== slugs.length) return fail("A linked thread no longer exists. Pick it again.");
  }

  const fields = { title, slug, summary, sort_order: sortOrder, is_featured: isFeatured === "on" };
  const saved = guideId
    ? await supabase.from("guides").update(fields).eq("id", guideId).select("id").maybeSingle()
    : await supabase.from("guides").insert(fields).select("id").single();
  if (saved.error) return fail(friendlyError(saved.error, GUIDE_ERRORS));
  if (!saved.data) return fail("Guide not found, or you don't have permission.");
  const savedId = saved.data.id;

  const { data: existing, error: existingError } = await supabase
    .from("guide_steps")
    .select("id")
    .eq("guide_id", savedId);
  if (existingError) return fail(friendlyError(existingError));
  const existingIds = new Set(existing.map((step) => step.id));

  const rows = steps.map((step, index) => ({
    key: step.key,
    id: step.id !== null && existingIds.has(step.id) ? step.id : null,
    guide_id: savedId,
    position: index + 1,
    title: step.title,
    body: step.body || null,
    thread_id: step.threadSlug ? (threadIds.get(step.threadSlug) ?? null) : null,
  }));
  const kept = rows.filter((row) => row.id !== null);
  const keptIds = new Set(kept.map((row) => row.id));
  const removed = [...existingIds].filter((stepId) => !keptIds.has(stepId));

  if (removed.length > 0) {
    const { error } = await supabase.from("guide_steps").delete().in("id", removed);
    if (error) return fail(friendlyError(error));
  }

  const parked = await Promise.all(
    kept.map((row, index) =>
      supabase.from("guide_steps").update({ position: PARKED_POSITION + index }).eq("id", row.id!),
    ),
  );
  const updated = await Promise.all(
    kept.map((row) =>
      supabase
        .from("guide_steps")
        .update({ position: row.position, title: row.title, body: row.body, thread_id: row.thread_id })
        .eq("id", row.id!),
    ),
  );
  const stepError = [...parked, ...updated].find((result) => result.error)?.error;
  if (stepError) return fail(friendlyError(stepError));

  const added = rows.filter((row) => row.id === null);
  const savedSteps = kept.map((row) => ({ key: row.key, id: row.id! }));
  if (added.length > 0) {
    const { data: inserted, error } = await supabase
      .from("guide_steps")
      .insert(
        added.map((row) => ({
          guide_id: row.guide_id,
          position: row.position,
          title: row.title,
          body: row.body,
          thread_id: row.thread_id,
        })),
      )
      .select("id, position");
    if (error) return fail(friendlyError(error));
    for (const step of inserted) {
      const row = added.find((candidate) => candidate.position === step.position);
      if (row) savedSteps.push({ key: row.key, id: step.id });
    }
  }

  revalidatePath("/", "layout");
  if (!guideId) redirect(`/mod/guides/${savedId}`);
  return { ok: true, message: "Guide saved.", savedSteps };
}

const guideOpSchema = z.object({ guideId: id, op: z.enum(["feature", "unfeature", "delete"]) });

export async function moderateGuide(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = guideOpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");
  const { guideId, op } = parsed.data;

  const denied = await requireModerator();
  if (denied) return fail(denied);

  const supabase = await createClient();
  const table = supabase.from("guides");
  const { data, error } = await (op === "delete"
    ? table.delete().eq("id", guideId).select("id")
    : table.update({ is_featured: op === "feature" }).eq("id", guideId).select("id"));
  if (error) return fail(friendlyError(error));
  if (!data?.length) return fail("Guide not found, or you don't have permission.");

  revalidatePath("/", "layout");
  if (op === "delete") redirect("/mod/guides");
  return { ok: true, message: op === "feature" ? "Guide featured on the home page." : "Guide no longer featured." };
}
