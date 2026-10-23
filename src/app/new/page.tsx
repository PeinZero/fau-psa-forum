import { Suspense } from "react";

import { SignInPrompt } from "@/components/sign-in-prompt";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { createThreadAction } from "@/components/write/actions";
import { ThreadForm } from "@/components/write/thread-form";

export const metadata = { title: "Submit a thread" };

async function NewThread() {
  const viewer = await getViewer();
  if (!viewer) {
    return <SignInPrompt next="/new" purpose="to submit a thread. Reading is open to everyone." />;
  }

  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");

  return (
    <>
      <p className="text-muted">
        A moderator reviews every new thread before it becomes public. After submitting you land on your thread, where
        only you and moderators can see it while it waits. You can have up to 3 threads waiting at once.
      </p>
      <ThreadForm
        categories={categories ?? []}
        initial={{ title: "", body: "", categoryId: null, city: null }}
        submitLabel="Submit for review"
        action={createThreadAction}
      />
    </>
  );
}

export default function NewThreadPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">Submit a thread</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <NewThread />
      </Suspense>
    </div>
  );
}
