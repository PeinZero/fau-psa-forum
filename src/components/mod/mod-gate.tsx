import type { ReactNode } from "react";

import { SignInPrompt } from "@/components/sign-in-prompt";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

import { recentEditsCutoff } from "./recent";
import { ModNav, type ModNavItem } from "./mod-nav";

// A friendly message instead of notFound(): members who applied to moderate should understand why the page is closed.
export async function ModGate({ children }: { children: ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) {
    return <SignInPrompt next="/mod" purpose="to open the moderation area." />;
  }

  if (!isModerator(viewer.role)) {
    return (
      <div role="alert" className="rounded-md border border-border p-4">
        <p className="font-medium">Moderators only</p>
        <p className="mt-1 text-sm text-muted">This area is for forum moderators.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const since = recentEditsCutoff();
  const [threads, edits, applications] = await Promise.all([
    supabase.from("threads").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("thread_revisions").select("id", { count: "exact", head: true }).gte("created_at", since),
    supabase.from("moderator_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const items: ModNavItem[] = [
    { href: "/mod", label: "Overview" },
    { href: "/mod/threads", label: "Pending threads", count: threads.count ?? 0 },
    { href: "/mod/edits", label: "Recent edits", count: edits.count ?? 0 },
    { href: "/mod/applications", label: "Applications", count: applications.count ?? 0 },
    { href: "/mod/categories", label: "Categories" },
    ...(viewer.role === "superadmin" ? [{ href: "/mod/users", label: "Users" }] : []),
  ];

  return (
    <>
      <ModNav items={items} />
      {children}
    </>
  );
}
