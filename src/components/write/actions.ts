"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getViewer } from "@/lib/auth/viewer";
import { imagesEnabled } from "@/lib/media/keys";
import { mediaStorage } from "@/lib/media/storage";
import { type ParsedImage, parseImageUploads, parseRemovedImageIds } from "@/lib/media/uploads";
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
    ["a thread can have at most 3 images", "A thread can have at most 3 images."],
    ["only the author can add images", "Only the author can add images to this thread."],
    ["only the author can change a thread's title and text", "Only the author can change the title and text."],
    ["archived threads are read-only", "This thread is archived, so it can't be changed anymore."],
    ["image storage is full", "Image uploads are paused for now. Please post without images."],
  ],
  codes: { "23503": "That category no longer exists. Please choose another one." },
} as const;

const UPLOAD_FAILED = "The images could not be uploaded. Please try again.";

const COMMENT_ERRORS = {
  messages: [
    ...THREAD_ERRORS.messages,
    // The parent was hidden (or never visible to this user) after the page loaded.
    ["a reply must belong to a visible comment", "You can't reply to that comment anymore."],
    [
      "new accounts cannot post links yet",
      "Links unlock once your account is a day old and you have written 3 comments. Please post without a link for now.",
    ],
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

type Supabase = Awaited<ReturnType<typeof createClient>>;

function imageRow(image: ParsedImage) {
  return {
    storage_key: image.key,
    content_type: image.contentType,
    width: image.width,
    height: image.height,
    size_bytes: image.size,
    alt_text: image.alt,
  };
}

/** Best effort: a file left behind costs storage but is never shown, since no row points to it. */
async function removeStoredImages(keys: string[]) {
  if (keys.length === 0) return;
  try {
    const failed = await mediaStorage().removeMany(keys);
    if (failed.length > 0) console.error("Image files could not be deleted:", failed);
  } catch (error) {
    console.error("Image files could not be deleted:", keys, error);
  }
}

/**
 * Asks the database first, so nothing is uploaded when a limit is reached, then uploads all
 * files. Returns an error message, or null once every file is stored.
 */
async function storeImages(
  supabase: Supabase,
  threadId: number | null,
  images: ParsedImage[],
  replacingIds: number[] = [],
): Promise<string | null> {
  if (!imagesEnabled()) return "Image uploads are not available right now.";
  const { error } = await supabase.rpc("check_image_upload", {
    p_thread_id: threadId,
    p_count: images.length,
    p_bytes: images.reduce((sum, image) => sum + image.size, 0),
    p_removed_ids: replacingIds,
  });
  if (error) return friendlyError(error, THREAD_ERRORS);

  let storage: ReturnType<typeof mediaStorage>;
  try {
    storage = mediaStorage();
  } catch (configError) {
    console.error(configError);
    return "Image uploads are not available right now.";
  }
  const results = await Promise.allSettled(images.map((image) => storage.put(image.key, image.bytes, image.contentType)));
  if (results.every((result) => result.status === "fulfilled")) return null;
  await removeStoredImages(images.filter((_, i) => results[i].status === "fulfilled").map((image) => image.key));
  return UPLOAD_FAILED;
}

/**
 * New files are checked and stored before anything is removed, so a failed replacement keeps
 * the old image. Returns an error message, or null when the images are as the author asked.
 */
async function changeImages(
  supabase: Supabase,
  threadId: number,
  removeIds: number[],
  images: ParsedImage[],
): Promise<string | null> {
  if (images.length > 0) {
    const failed = await storeImages(supabase, threadId, images, removeIds);
    if (failed) return `Your text was saved, but the images were not changed. ${failed}`;
  }

  if (removeIds.length > 0) {
    const { data: removed, error } = await supabase
      .from("thread_images")
      .delete()
      .eq("thread_id", threadId)
      .in("id", removeIds)
      .select("storage_key");
    if (error) {
      await removeStoredImages(images.map((image) => image.key));
      return `Your text was saved, but the images were not changed. ${friendlyError(error, THREAD_ERRORS)}`;
    }
    await removeStoredImages((removed ?? []).map((image) => image.storage_key));
  }

  if (images.length > 0) {
    const { error } = await supabase
      .from("thread_images")
      .insert(images.map((image) => ({ ...imageRow(image), thread_id: threadId })));
    if (error) {
      await removeStoredImages(images.map((image) => image.key));
      return `Your text was saved, but the new images were not added. ${friendlyError(error, THREAD_ERRORS)}`;
    }
  }
  return null;
}

/**
 * Category and city only when the author changed them, so an edit page opened before a moderator
 * moved the thread doesn't move it back.
 */
function placementChanges(
  formData: FormData,
  { categoryId, city }: { categoryId: number; city: "erlangen" | "nuremberg" | "both" | null },
) {
  const startedWith = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : null;
  };
  return {
    ...(startedWith("initialCategoryId") !== String(categoryId) && { category_id: categoryId }),
    ...(startedWith("initialCity") !== (city ?? "") && { city }),
  };
}

export async function createThreadAction(formData: FormData): Promise<FormState> {
  const result = parseThread(formData);
  if (!result.data) return result.state;
  if (!(await getViewer())) return { error: SIGN_IN_REQUIRED };
  const uploads = await parseImageUploads(formData, 0);
  if (!uploads.ok) return { error: uploads.error };
  const supabase = await createClient();

  if (uploads.images.length > 0) {
    const failed = await storeImages(supabase, null, uploads.images);
    if (failed) return { error: failed };
  }
  // One transaction, so a thread never appears without the images it was posted with.
  const { data: slug, error } = await supabase.rpc("create_thread_with_images", {
    p_title: result.data.title,
    p_body: result.data.body,
    p_category_id: result.data.categoryId,
    p_city: result.data.city,
    p_images: uploads.images.map(imageRow),
  });
  if (error || !slug) {
    await removeStoredImages(uploads.images.map((image) => image.key));
    return { error: friendlyError(error ?? {}, THREAD_ERRORS) };
  }

  // The thread joins lists, the author's profile and the moderators' pending count in the header.
  revalidatePath("/", "layout");
  redirect(`/t/${slug}`);
}

export async function updateThreadAction(threadId: number, formData: FormData): Promise<FormState> {
  const result = parseThread(formData);
  if (!result.data) return result.state;
  if (!(await getViewer())) return { error: SIGN_IN_REQUIRED };
  const supabase = await createClient();

  const removeIds = parseRemovedImageIds(formData);
  const { data: current } = await supabase.from("thread_images").select("id").eq("thread_id", threadId);
  const keptCount = (current ?? []).filter((image) => !removeIds.includes(image.id)).length;
  const uploads = await parseImageUploads(formData, keptCount);
  if (!uploads.ok) return { error: uploads.error };

  const { data, error } = await supabase
    .from("threads")
    .update({ title: result.data.title, body: result.data.body, ...placementChanges(formData, result.data) })
    .eq("id", threadId)
    .select("slug")
    .maybeSingle();
  // RLS filters rows the viewer may not edit instead of raising.
  if (error || !data) return { error: error ? friendlyError(error, THREAD_ERRORS) : "You are not allowed to edit this thread." };

  // The text is saved from here on, so lists, the thread and the moderators' recent-edits count
  // must refresh even when the images fail.
  revalidatePath("/", "layout");
  const imageError = await changeImages(supabase, threadId, removeIds, uploads.images);
  if (imageError) return { error: imageError };
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
