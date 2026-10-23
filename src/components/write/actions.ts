"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { firstIssue, friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

export type FormState = {
  error?: string;
  fieldErrors?: Partial<Record<"title" | "body" | "categoryId" | "city", string>>;
};

const threadSchema = z.object({
  title: z.string().trim().min(8, "Title must be at least 8 characters.").max(150, "Title can be at most 150 characters."),
  body: z.string().max(20000, "The text can be at most 20,000 characters.").refine((v) => v.trim().length > 0, "Please write something."),
  categoryId: z.coerce.number().int().positive("Please choose a category."),
  city: z.enum(["erlangen", "nuremberg", "both"]).nullable(),
});

const commentSchema = z.object({
  body: z
    .string()
    .max(5000, "A comment can be at most 5,000 characters.")
    .refine((v) => v.trim().length > 0, "Please write a comment."),
});

const newCommentSchema = commentSchema.extend({
  parentId: z.number().int().positive().optional(),
});

const THREAD_ERRORS = {
  messages: [
    [
      "3 threads waiting for review",
      "You already have 3 threads waiting for review. Please wait until a moderator reviews one of them before submitting another.",
    ],
    ["only possible on published threads", "This thread is not open for comments."],
  ],
  codes: { "23503": "That category no longer exists. Please choose another one." },
} as const;

const COMMENT_ERRORS = {
  messages: [
    ...THREAD_ERRORS.messages,
    // The parent was hidden (or never visible to this user) after the page loaded.
    ["a reply must belong to a visible comment", "You can't reply to that comment anymore."],
  ],
} as const;

function parseThread(formData: FormData) {
  const city = formData.get("city");
  const parsed = threadSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    categoryId: formData.get("categoryId"),
    city: typeof city === "string" && city !== "" ? city : null,
  });
  if (parsed.success) return { data: parsed.data };
  const fieldErrors: NonNullable<FormState["fieldErrors"]> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if ((key === "title" || key === "body" || key === "categoryId" || key === "city") && !fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return { state: { error: "Please fix the highlighted fields.", fieldErrors } satisfies FormState };
}

export async function createThreadAction(formData: FormData): Promise<FormState> {
  const result = parseThread(formData);
  if (!result.data) return result.state;
  if (!(await getViewer())) return { error: SIGN_IN_REQUIRED };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("threads")
    .insert({
      title: result.data.title,
      body: result.data.body,
      category_id: result.data.categoryId,
      city: result.data.city,
    })
    .select("slug")
    .single();
  if (error || !data) return { error: friendlyError(error ?? {}, THREAD_ERRORS) };

  // The thread joins lists, the author's profile and the moderators' pending count in the header.
  revalidatePath("/", "layout");
  redirect(`/t/${data.slug}`);
}

export async function updateThreadAction(threadId: number, formData: FormData): Promise<FormState> {
  const result = parseThread(formData);
  if (!result.data) return result.state;
  if (!(await getViewer())) return { error: SIGN_IN_REQUIRED };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("threads")
    .update({
      title: result.data.title,
      body: result.data.body,
      category_id: result.data.categoryId,
      city: result.data.city,
    })
    .eq("id", threadId)
    .select("slug")
    .maybeSingle();
  if (error) return { error: friendlyError(error, THREAD_ERRORS) };
  // RLS filters rows the viewer may not edit instead of raising.
  if (!data) return { error: "You are not allowed to edit this thread." };

  // Titles show in every list, and the edit joins the moderators' recent-edits count in the header.
  revalidatePath("/", "layout");
  redirect(`/t/${data.slug}`);
}

export type CommentResult = { ok: true } | { ok: false; error: string };

export async function createCommentAction(threadId: number, body: string, parentId?: number): Promise<CommentResult> {
  const parsed = newCommentSchema.safeParse({ body, parentId });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
  if (!(await getViewer())) return { ok: false, error: SIGN_IN_REQUIRED };
  const supabase = await createClient();

  const { error } = await supabase
    .from("comments")
    .insert({ thread_id: threadId, body: parsed.data.body, parent_id: parsed.data.parentId ?? null });
  if (error) return { ok: false, error: friendlyError(error, COMMENT_ERRORS) };

  await revalidateThread(threadId);
  return { ok: true };
}

export async function updateCommentAction(commentId: number, body: string): Promise<CommentResult> {
  const parsed = commentSchema.safeParse({ body });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed) };
  if (!(await getViewer())) return { ok: false, error: SIGN_IN_REQUIRED };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("comments")
    .update({ body: parsed.data.body })
    .eq("id", commentId)
    .select("thread_id")
    .maybeSingle();
  if (error) return { ok: false, error: friendlyError(error, COMMENT_ERRORS) };
  if (!data) return { ok: false, error: "You are not allowed to edit this comment." };

  await revalidateThread(data.thread_id);
  return { ok: true };
}

async function revalidateThread(threadId: number) {
  const supabase = await createClient();
  const { data } = await supabase.from("threads").select("slug").eq("id", threadId).maybeSingle();
  if (data) revalidatePath(`/t/${data.slug}`);
}
