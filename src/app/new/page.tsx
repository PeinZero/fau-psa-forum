import Link from "next/link";
import { Suspense } from "react";

import { getOwnRestriction } from "@/components/restrictions/data";
import { RestrictionBanner } from "@/components/restrictions/restriction-banner";
import { SignInCard } from "@/components/sign-in-prompt";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { createThreadAction } from "@/components/write/actions";
import { ThreadForm } from "@/components/write/thread-form";
import { ThreadFormSkeleton } from "@/components/write/thread-form-skeleton";

export const metadata = { title: "Ask a question" };

async function NewThread() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <SignInCard
        next="/new"
        title="Sign in to ask a question"
        description="Reading is open to everyone. To start a thread, sign in with Google or an email link — it takes a few seconds."
      />
    );
  }

  const supabase = await createClient();
  const [{ data: categories }, restriction] = await Promise.all([
    supabase.from("categories").select("id, slug, name, description").order("sort_order"),
    getOwnRestriction(viewer.userId),
  ]);

  return (
    <>
      {restriction && <RestrictionBanner restriction={restriction} className="animate-fade-up" />}
      <div className="animate-fade-up">
        <ThreadForm
          categories={categories ?? []}
          initial={{ title: "", body: "", categoryId: null, city: null }}
          submitLabel="Ask a question"
          pendingLabel="Submitting…"
          suggestSimilar
          footnote="A moderator reviews new threads before they go public. Until then only you and moderators can see it; up to 3 can wait at once."
          action={createThreadAction}
        />
      </div>
    </>
  );
}

export default function NewThreadPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader
        className="mb-4"
        title="Ask a question"
        description={
          <>
            Answers stay here for everyone who comes after you.{" "}
            <Link href="/search" className="font-medium text-accent underline-offset-2 hover:underline">
              Search first
            </Link>{" "}
            — it may already be answered.
          </>
        }
      />
      <Suspense fallback={<ThreadFormSkeleton />}>
        <NewThread />
      </Suspense>
    </div>
  );
}
