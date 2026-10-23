import Link from "next/link";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

const linkClass =
  "inline-flex min-h-11 items-center rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-border/40";

async function pendingModerationCount(): Promise<number> {
  const supabase = await createClient();
  const [threads, applications] = await Promise.all([
    supabase.from("threads").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("moderator_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);
  return (threads.count ?? 0) + (applications.count ?? 0);
}

export default async function UserMenu() {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <Link href="/login" className={linkClass}>
        Sign in
      </Link>
    );
  }

  const pending = viewer.role === "member" ? 0 : await pendingModerationCount();

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {viewer.role !== "member" && (
        <Link href="/mod" className={linkClass}>
          Moderation
          {pending > 0 && (
            <span className="ml-2 rounded-full bg-accent px-2 text-xs text-accent-foreground">
              {pending}
              <span className="sr-only"> pending</span>
            </span>
          )}
        </Link>
      )}
      <Link href="/account" className={`${linkClass} max-w-40`}>
        <span className="truncate">{viewer.displayName}</span>
      </Link>
    </div>
  );
}
