import { Info, Search } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { getOwnRestriction } from "@/components/restrictions/data";
import { RestrictionBanner } from "@/components/restrictions/restriction-banner";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { createThreadAction } from "@/components/write/actions";
import { ThreadForm } from "@/components/write/thread-form";

export const metadata = { title: "Ask a question" };

async function NewThread() {
  const viewer = await getViewer();
  if (!viewer) {
    return <SignInPrompt next="/new" purpose="to ask a question. Reading is open to everyone." />;
  }

  const supabase = await createClient();
  const [{ data: categories }, restriction] = await Promise.all([
    supabase.from("categories").select("id, name, description").order("sort_order"),
    getOwnRestriction(viewer.userId),
  ]);

  return (
    <>
      {restriction && <RestrictionBanner restriction={restriction} className="animate-fade-up" />}
      <Card className="animate-fade-up flex items-start gap-3 bg-accent-soft/40">
        <Info aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-accent" />
        <div className="text-meta text-muted">
          <p className="font-medium text-foreground">How review works</p>
          <p className="mt-1">
            A moderator reviews every new thread before it becomes public. After submitting you land on your thread,
            where only you and moderators can see it while it waits. You can have up to 3 threads waiting at once.
          </p>
        </div>
      </Card>
      <Card className="animate-fade-up" style={stagger(1)}>
        <ThreadForm
          categories={categories ?? []}
          initial={{ title: "", body: "", categoryId: null, city: null }}
          submitLabel="Ask a question"
          suggestSimilar
          action={createThreadAction}
        />
      </Card>
    </>
  );
}

export default function NewThreadPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <PageHeader
        className="mb-2"
        title="Ask a question"
        description="Start a thread for the PSA community. Answers stay here for everyone who comes after you."
      />
      <p className="flex items-center gap-2 text-meta text-muted">
        <Search aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
        <span>
          <Link href="/search" className="font-medium text-accent underline-offset-2 hover:underline">
            Search first
          </Link>{" "}
          — your question may already be answered.
        </span>
      </p>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <NewThread />
      </Suspense>
    </div>
  );
}
