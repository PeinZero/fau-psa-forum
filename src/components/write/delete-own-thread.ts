"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { ActionState } from "@/components/mod/actions";
import { getViewer } from "@/lib/auth/viewer";
import { mediaStorage } from "@/lib/media/storage";
import { firstIssue, friendlyError, SIGN_IN_REQUIRED } from "@/lib/supabase/errors";
import { createClient } from "@/lib/supabase/server";

const DELETE_ERRORS = {
  messages: [
    ["thread not found", "Thread not found. It may already be deleted."],
    ["only the author can delete this thread", "Only the author can delete this thread."],
    ["only pending or rejected threads can be deleted", "Only threads that are waiting for review or were rejected can be deleted."],
  ],
} as const;

const schema = z.object({ threadId: z.coerce.number().int().positive() });

/** Authors withdraw a thread nobody has approved yet; its image files go with it, but a storage hiccup must not undo that. */
export async function deleteOwnThread(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: firstIssue(parsed) };

  if (!(await getViewer())) return { ok: false, message: SIGN_IN_REQUIRED };

  const supabase = await createClient();
  const { data: keys, error } = await supabase.rpc("delete_own_thread", { p_thread_id: parsed.data.threadId });
  if (error) return { ok: false, message: friendlyError(error, DELETE_ERRORS) };

  if (keys?.length) {
    try {
      const failed = await mediaStorage().removeMany(keys);
      if (failed.length) console.error("Thread deleted, but some image files remain in storage:", failed);
    } catch (storageError) {
      console.error("Thread deleted, but its image files could not be removed:", storageError);
    }
  }

  revalidatePath("/", "layout");
  redirect("/me/threads?deleted=thread");
}
