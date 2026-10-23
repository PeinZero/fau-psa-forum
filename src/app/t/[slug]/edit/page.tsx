import { Info } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SignInPrompt } from "@/components/sign-in-prompt";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { updateThreadAction } from "@/components/write/actions";
import { ThreadForm } from "@/components/write/thread-form";
import { getOwnRestriction } from "@/components/restrictions/data";
import { RestrictionBanner } from "@/components/restrictions/restriction-banner";

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
      <p role="alert" className="text-muted">
        You are not allowed to edit this thread.{" "}
        <Link href={`/t/${slug}`} className="text-accent underline underline-offset-2">
          Back to the thread
        </Link>
      </p>
    );
  }

  const [{ data: categories }, restriction] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    getOwnRestriction(viewer.userId),
  ]);

  const note =
    thread.status === "published"
      ? "This thread is published: your changes go live immediately, and moderators can see the previous version."
      : thread.status === "rejected" && isAuthor
        ? `This thread was rejected${thread.rejection_reason ? `: ${thread.rejection_reason}` : "."} It stays rejected after you edit it, and a moderator has to approve it again.`
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
      <Card className="animate-fade-up" style={stagger(1)}>
        <ThreadForm
          categories={categories ?? []}
          initial={{ title: thread.title, body: thread.body, categoryId: thread.category_id, city: thread.city }}
          submitLabel="Save changes"
          action={updateThreadAction.bind(null, thread.id)}
        />
      </Card>
      <Link href={`/t/${slug}`} className={buttonClasses({ variant: "ghost", className: "self-start" })}>
        Cancel
      </Link>
    </>
  );
}

export default function EditThreadPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader className="mb-2" title="Edit thread" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <EditThread params={params} />
      </Suspense>
    </div>
  );
}
