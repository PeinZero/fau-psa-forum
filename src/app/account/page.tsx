import Link from "next/link";
import { Suspense } from "react";
import { getViewer } from "@/lib/auth/viewer";
import { formatDate, statusLabels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { ModeratorApplicationForm, ProfileForm } from "./forms";

export const metadata = { title: "Your account" };

const linkClass = "inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-2";

async function ModeratorSection({ userId, role }: { userId: string; role: string }) {
  if (role !== "member") {
    return (
      <p>
        Your role: <strong>{role === "superadmin" ? "Superadmin" : "Moderator"}</strong>.{" "}
        <Link href="/mod" className={linkClass}>
          Open moderation
        </Link>
      </p>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("moderator_applications")
    .select("status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.status === "pending") return <p>Your application is being reviewed.</p>;
  return (
    <div className="space-y-4">
      {data?.status === "rejected" && (
        <p className="text-muted">Your last application was not accepted. You can apply again.</p>
      )}
      <ModeratorApplicationForm />
    </div>
  );
}

async function MyThreads({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: threads, error } = await supabase
    .from("threads")
    .select("id, slug, title, status, rejection_reason, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) return <p role="alert">Could not load your threads.</p>;
  if (!threads.length) return <p className="text-muted">You have not posted any threads yet.</p>;

  return (
    <ul className="divide-y divide-border border-y border-border">
      {threads.map((t) => (
        <li key={t.id} className="space-y-1 py-3">
          <Link href={`/t/${t.slug}`} className="break-words font-medium text-accent underline underline-offset-2">
            {t.title}
          </Link>
          <p className="text-sm text-muted">
            {statusLabels[t.status]} &middot; {formatDate(t.created_at)}
          </p>
          {t.status === "rejected" && t.rejection_reason && (
            <p className="text-sm">Reason: {t.rejection_reason}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

async function AccountContent() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <p>
        <Link href="/login?next=/account" className={linkClass}>
          Sign in
        </Link>{" "}
        to manage your account.
      </p>
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("affiliation")
    .eq("id", viewer.userId)
    .maybeSingle();

  return (
    <div className="space-y-10">
      <section aria-labelledby="profile-heading" className="space-y-4">
        <h2 id="profile-heading" className="text-lg font-semibold">
          Profile
        </h2>
        <ProfileForm displayName={viewer.displayName} affiliation={profile?.affiliation ?? null} />
      </section>

      <section aria-labelledby="threads-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="threads-heading" className="text-lg font-semibold">
            My threads
          </h2>
          <Link href="/new" className={linkClass}>
            New thread
          </Link>
        </div>
        <Suspense fallback={<p className="text-muted">Loading your threads...</p>}>
          <MyThreads userId={viewer.userId} />
        </Suspense>
      </section>

      <section aria-labelledby="mod-heading" className="space-y-4">
        <h2 id="mod-heading" className="text-lg font-semibold">
          Become a moderator
        </h2>
        <Suspense fallback={<p className="text-muted">Loading...</p>}>
          <ModeratorSection userId={viewer.userId} role={viewer.role} />
        </Suspense>
      </section>

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 py-2 text-sm font-medium"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Your account</h1>
      <Suspense fallback={<p className="text-muted">Loading...</p>}>
        <AccountContent />
      </Suspense>
    </div>
  );
}
