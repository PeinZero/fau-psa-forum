import { ArrowLeft, Info, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { MoveThreadForm } from "@/components/mod/move-thread-form";
import { SignInCard } from "@/components/sign-in-prompt";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { imagesEnabled, mediaUrl } from "@/lib/media/keys";
import { createClient } from "@/lib/supabase/server";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { updateThreadAction } from "@/components/write/actions";
import { ThreadForm } from "@/components/write/thread-form";
import { ThreadFormSkeleton } from "@/components/write/thread-form-skeleton";
import { getOwnRestriction } from "@/components/restrictions/data";
import { RestrictionBanner } from "@/components/restrictions/restriction-banner";

export const metadata = { title: "Edit thread" };

/** The heading follows what the viewer may do here: authors edit, other moderators only move. */
async function EditHeading({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const [{ data: thread }, viewer] = await Promise.all([
    supabase.from("threads").select("author_id").eq("slug", slug).maybeSingle(),
    getViewer(),
  ]);
  const moving = thread && viewer && thread.author_id !== viewer.userId && isModerator(viewer.role);
  return <PageHeader className="mb-4" title={moving ? "Move thread" : "Edit thread"} />;
}

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
    return (
      <SignInCard
        next={`/t/${slug}/edit`}
        title="Sign in to edit this thread"
        description="Only the author can edit a thread; moderators can move it."
      />
    );
  }

  const isAuthor = thread.author_id === viewer.userId;
  if (!isAuthor && !isModerator(viewer.role)) {
    return (
      <EmptyState
        icon={<Lock />}
        title="You can't edit this thread"
        action={
          <Link href={`/t/${slug}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <ArrowLeft strokeWidth={1.75} />
            Back to the thread
          </Link>
        }
      >
        <span role="alert">Only the author can edit it.</span>
      </EmptyState>
    );
  }

  if (!isAuthor) {
    const { data: categories } = await supabase.from("categories").select("id, slug, name, description").order("sort_order");
    return (
      <div className="animate-fade-up">
        <MoveThreadForm
          threadId={thread.id}
          title={thread.title}
          categories={categories ?? []}
          categoryId={thread.category_id}
          city={thread.city}
          cancelHref={`/t/${slug}`}
        />
      </div>
    );
  }

  const [{ data: categories }, restriction, { data: images }] = await Promise.all([
    supabase.from("categories").select("id, slug, name, description").order("sort_order"),
    getOwnRestriction(viewer.userId),
    supabase
      .from("thread_images")
      .select("id, storage_key, alt_text, width, height")
      .eq("thread_id", thread.id)
      .order("id"),
  ]);

  const note =
    thread.status === "published"
      ? "This thread is published: your changes go live immediately, and moderators can see the previous version."
      : thread.status === "rejected" && isAuthor
        ? `This thread was rejected${thread.rejection_reason ? `: ${thread.rejection_reason}` : "."} It stays rejected after you edit it, and a moderator has to approve it again. Rejected threads are deleted 7 days after the rejection or your last edit, unless a moderator approves them.`
        : null;

  return (
    <>
      {restriction?.kind === "ban" && <RestrictionBanner restriction={restriction} />}
      {note ? (
        <Card role="note" className="animate-fade-up flex items-start gap-3 bg-accent-soft/40">
          <Info aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-accent" />
          <p className="text-meta text-muted">{note}</p>
        </Card>
      ) : null}
      <div className="animate-fade-up" style={stagger(1)}>
        <ThreadForm
          categories={categories ?? []}
          initial={{ title: thread.title, body: thread.body, categoryId: thread.category_id, city: thread.city }}
          submitLabel="Save changes"
          pendingLabel="Saving…"
          cancelHref={`/t/${slug}`}
          images={
            imagesEnabled()
              ? {
                  existing: (images ?? []).map((image) => ({
                    id: image.id,
                    url: mediaUrl(image.storage_key),
                    alt: image.alt_text,
                    width: image.width,
                    height: image.height,
                  })),
                }
              : undefined
          }
          action={updateThreadAction.bind(null, thread.id)}
        />
      </div>
    </>
  );
}

export default function EditThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Suspense fallback={<PageHeader className="mb-4" title="Edit thread" />}>
        <EditHeading params={params} />
      </Suspense>
      <Suspense fallback={<ThreadFormSkeleton />}>
        <EditThread params={params} />
      </Suspense>
    </div>
  );
}
