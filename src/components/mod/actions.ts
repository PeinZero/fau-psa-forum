"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ANNOUNCEMENT_BODY_MAX, ANNOUNCEMENT_TITLE_MAX, ANNOUNCEMENT_TITLE_MIN } from "@/components/announcements/limits";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { firstIssue, friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { ok: boolean; message: string } | null;

const MOD_ERRORS = {
  messages: [
    ["cannot demote the last superadmin", "You can't demote the last superadmin. Promote someone else first."],
    ["cannot review your own application", "You can't review your own application. Another moderator has to do it."],
    ["already reviewed", "This application was already reviewed."],
    ["best answer must be", "The best answer must be a visible comment of this thread."],
    ["comments are only possible", "The thread must be published for this to work."],
    ["categories_slug_key", "Another category already uses this slug."],
    ["categories_name_key", "Another category already uses this name."],
  ],
  codes: { "23503": "This category still has threads. Move or delete them first." },
} as const;

const fail = (message: string): ActionState => ({ ok: false, message });

function done(message: string): ActionState {
  revalidatePath("/", "layout");
  return { ok: true, message };
}

async function requireRole(level: "moderator" | "superadmin"): Promise<string | null> {
  const viewer = await getViewer();
  if (!viewer) return SIGN_IN_REQUIRED;
  if (level === "superadmin" && viewer.role !== "superadmin") return "Only the superadmin can do this.";
  if (!isModerator(viewer.role)) return "Only moderators can do this.";
  return null;
}

const id = z.coerce.number().int().positive();

const threadSchema = z.object({
  threadId: id,
  op: z.enum(["approve", "reject", "archive", "unarchive", "outdated", "current", "pin", "unpin"]),
  reason: z.string().trim().max(1000, "The reason can be at most 1000 characters.").optional(),
});

export async function moderateThread(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = threadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(firstIssue(parsed));
  const { threadId, op, reason } = parsed.data;

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const updates = {
    approve: { status: "published", rejection_reason: null },
    reject: { status: "rejected", rejection_reason: reason ?? "" },
    archive: { status: "archived" },
    unarchive: { status: "published" },
    outdated: { is_outdated: true },
    current: { is_outdated: false },
    pin: { is_pinned: true },
    unpin: { is_pinned: false },
  } as const;

  if (op === "reject" && !reason) return fail("Please give a reason for the rejection.");

  const supabase = await createClient();
  const { data, error } = await supabase.from("threads").update(updates[op]).eq("id", threadId).select("id");
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  if (!data?.length) return fail("Thread not found, or you don't have permission.");

  const messages = {
    approve: "Thread approved.",
    reject: "Thread rejected.",
    archive: "Thread archived.",
    unarchive: "Thread unarchived.",
    outdated: "Marked as outdated.",
    current: "Outdated flag removed.",
    pin: "Thread pinned.",
    unpin: "Thread unpinned.",
  };
  return done(messages[op]);
}

const commentSchema = z.object({
  threadId: id,
  commentId: id,
  op: z.enum(["best", "unbest", "hide", "unhide"]),
});

export async function moderateComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");
  const { threadId, commentId, op } = parsed.data;

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const supabase = await createClient();

  if (op === "best" || op === "unbest") {
    const { data, error } = await supabase
      .from("threads")
      .update({ best_comment_id: op === "best" ? commentId : null })
      .eq("id", threadId)
      .select("id");
    if (error) return fail(friendlyError(error, MOD_ERRORS));
    if (!data?.length) return fail("Thread not found, or you don't have permission.");
    return done(op === "best" ? "Marked as best answer." : "Best answer removed.");
  }

  if (op === "hide") {
    // A hidden comment can't stay the best answer.
    const { error: clearError } = await supabase
      .from("threads")
      .update({ best_comment_id: null })
      .eq("id", threadId)
      .eq("best_comment_id", commentId);
    if (clearError) return fail(friendlyError(clearError, MOD_ERRORS));
  }

  const { data, error } = await supabase
    .from("comments")
    .update({ hidden_at: op === "hide" ? new Date().toISOString() : null })
    .eq("id", commentId)
    .eq("thread_id", threadId)
    .select("id");
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  if (!data?.length) return fail("Comment not found, or you don't have permission.");
  return done(op === "hide" ? "Comment hidden." : "Comment visible again.");
}

const applicationSchema = z.object({
  applicationId: id,
  decision: z.enum(["approved", "rejected"]),
});

export async function reviewApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = applicationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_moderator_application", {
    application_id: parsed.data.applicationId,
    decision: parsed.data.decision,
  });
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  return done(parsed.data.decision === "approved" ? "Application approved." : "Application rejected.");
}

const categorySchema = z.object({
  categoryId: id.optional(),
  name: z.string().trim().min(2, "The name needs at least 2 characters.").max(60, "The name can be at most 60 characters."),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "The slug may only contain lowercase letters, digits and single hyphens."),
  description: z.string().trim().max(300, "The description can be at most 300 characters."),
  sortOrder: z.coerce.number().int("The order must be a whole number.").min(-100000).max(100000),
});

export async function saveCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = categorySchema.safeParse({ ...raw, categoryId: raw.categoryId || undefined, sortOrder: raw.sortOrder || 0 });
  if (!parsed.success) return fail(firstIssue(parsed));
  const { categoryId, name, slug, description, sortOrder } = parsed.data;

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const values = { name, slug, description: description || null, sort_order: sortOrder };
  const supabase = await createClient();

  if (categoryId === undefined) {
    const { error } = await supabase.from("categories").insert(values);
    if (error) return fail(friendlyError(error, MOD_ERRORS));
    return done("Category created.");
  }

  const { data, error } = await supabase.from("categories").update(values).eq("id", categoryId).select("id");
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  if (!data?.length) return fail("Category not found, or you don't have permission.");
  return done("Category saved.");
}

export async function deleteCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ categoryId: id }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");

  const denied = await requireRole("superadmin");
  if (denied) return fail(denied);

  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").delete().eq("id", parsed.data.categoryId).select("id");
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  if (!data?.length) return fail("Category not found, or you don't have permission.");
  return done("Category deleted.");
}

const roleSchema = z.object({
  target: z.string().uuid(),
  role: z.enum(["member", "moderator", "superadmin"]),
});

export async function changeRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = roleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");

  const denied = await requireRole("superadmin");
  if (denied) return fail(denied);

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    target: parsed.data.target,
    new_role: parsed.data.role,
  });
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  return done("Role updated.");
}

const reportSchema = z.object({
  reportId: id,
  status: z.enum(["resolved", "dismissed", "open"]),
});

export async function setReportStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.reportId)
    .select("id");
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  if (!data?.length) return fail("Report not found, or you don't have permission.");

  const messages = { resolved: "Report resolved.", dismissed: "Report dismissed.", open: "Report reopened." };
  return done(messages[parsed.data.status]);
}

const announcementSchema = z.object({
  announcementId: id.optional(),
  title: z
    .string()
    .trim()
    .min(ANNOUNCEMENT_TITLE_MIN, `The title needs at least ${ANNOUNCEMENT_TITLE_MIN} characters.`)
    .max(ANNOUNCEMENT_TITLE_MAX, `The title can be at most ${ANNOUNCEMENT_TITLE_MAX} characters.`),
  body: z
    .string()
    .trim()
    .min(1, "Please write the announcement.")
    .max(ANNOUNCEMENT_BODY_MAX, `The text can be at most ${ANNOUNCEMENT_BODY_MAX.toLocaleString("en")} characters.`),
});

export async function saveAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = announcementSchema.safeParse({ ...raw, announcementId: raw.announcementId || undefined });
  if (!parsed.success) return fail(firstIssue(parsed));
  const { announcementId, title, body } = parsed.data;

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const values = { title, body, is_pinned: formData.get("isPinned") === "on" };
  const supabase = await createClient();

  if (announcementId === undefined) {
    const { error } = await supabase.from("announcements").insert(values);
    if (error) return fail(friendlyError(error, MOD_ERRORS));
    return done("Announcement posted. Everyone has been notified.");
  }

  const { data, error } = await supabase.from("announcements").update(values).eq("id", announcementId).select("id");
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  if (!data?.length) return fail("Announcement not found, or you don't have permission.");
  return done("Announcement saved.");
}

const announcementOpSchema = z.object({
  announcementId: id,
  op: z.enum(["pin", "unpin", "delete"]),
});

export async function moderateAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = announcementOpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");
  const { announcementId, op } = parsed.data;

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const supabase = await createClient();
  const table = supabase.from("announcements");
  const { data, error } = await (op === "delete"
    ? table.delete().eq("id", announcementId).select("id")
    : table.update({ is_pinned: op === "pin" }).eq("id", announcementId).select("id"));
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  if (!data?.length) return fail("Announcement not found, or you don't have permission.");

  const messages = { pin: "Announcement pinned.", unpin: "Announcement unpinned.", delete: "Announcement deleted." };
  return done(messages[op]);
}

/** Confirms a thread is still accurate; the open "needs update" requests on it are answered by that. */
export async function markThreadVerified(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = z.object({ threadId: id }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_thread_verified", { thread_id: parsed.data.threadId });
  if (error) return fail(friendlyError(error, MOD_ERRORS));

  const { error: resolveError } = await supabase
    .from("update_requests")
    .update({ status: "resolved" })
    .eq("thread_id", parsed.data.threadId)
    .eq("status", "open");
  if (resolveError) return fail(friendlyError(resolveError, MOD_ERRORS));
  return done("Marked as still accurate.");
}

const updateRequestSchema = z.object({
  requestId: id,
  status: z.enum(["resolved", "dismissed"]),
});

export async function setUpdateRequestStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = updateRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail("Invalid request.");

  const denied = await requireRole("moderator");
  if (denied) return fail(denied);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("update_requests")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.requestId)
    .select("id");
  if (error) return fail(friendlyError(error, MOD_ERRORS));
  if (!data?.length) return fail("Request not found, or you don't have permission.");
  return done(parsed.data.status === "resolved" ? "Request resolved." : "Request dismissed.");
}
