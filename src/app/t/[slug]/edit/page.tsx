import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SignInPrompt } from "@/components/sign-in-prompt";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { updateThreadAction } from "@/components/write/actions";
import { ThreadForm } from "@/components/write/thread-form";

export const metadata = { title: "Edit thread" };

async function EditThread({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: thread } = await supabase
    .from("threads")
    .select("id, title, body, category_id, city, author_id, status, rejection_reason")
    .eq("slug", slug)
    .maybeSingle();
  if (!thread) notFound();

  const viewer = await getViewer();
  if (!viewer) {
    return <SignInPrompt next={`/t/${slug}/edit`} purpose="to edit this thread." />;
  }

  const isAuthor = thread.author_id === viewer.userId;
  if (!isAuthor && !isModerator(viewer.role)) {
    return (
      <p role="alert">
        You are not allowed to edit this thread.{" "}
        <Link href={`/t/${slug}`} className="text-accent underline">
          Back to the thread
        </Link>
      </p>
    );
  }

  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");

  return (
    <>
      {thread.status === "published" ? (
        <p className="text-muted">
          This thread is published: your changes go live immediately, and moderators can see the previous version.
        </p>
      ) : null}
      {thread.status === "rejected" && isAuthor ? (
        <p role="note" className="text-muted">
          This thread was rejected{thread.rejection_reason ? `: ${thread.rejection_reason}` : "."} It stays rejected
          after you edit it, and a moderator has to approve it again.
        </p>
      ) : null}
      <ThreadForm
        categories={categories ?? []}
        initial={{ title: thread.title, body: thread.body, categoryId: thread.category_id, city: thread.city }}
        submitLabel="Save changes"
        action={updateThreadAction.bind(null, thread.id)}
      />
      <Link href={`/t/${slug}`} className="min-h-11 text-sm text-muted underline">
        Cancel
      </Link>
    </>
  );
}

export default function EditThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Edit thread</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <EditThread params={params} />
      </Suspense>
    </div>
  );
}
