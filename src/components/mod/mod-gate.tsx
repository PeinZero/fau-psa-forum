import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { getViewer, isModerator } from "@/lib/auth/viewer";

import { getModCounts } from "./counts";
import { ModNav, type ModNavItem } from "./mod-nav";

// A friendly message instead of notFound(): members who applied to moderate should understand why the page is closed.
export async function ModGate({ children }: { children: ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <EmptyState icon={<Lock />} title="Sign in required">
        <SignInPrompt next="/mod" purpose="to open the moderation area." />
      </EmptyState>
    );
  }

  if (!isModerator(viewer.role)) {
    return (
      <EmptyState icon={<Lock />} title="Moderators only">
        <span role="alert">This area is for forum moderators.</span>
      </EmptyState>
    );
  }

  const counts = await getModCounts();

  const items: ModNavItem[] = [
    { href: "/mod", label: "Overview", icon: "overview" },
    { href: "/mod/threads", label: "Pending threads", icon: "threads", count: counts.threads },
    { href: "/mod/reports", label: "Reports", icon: "reports", count: counts.reports },
    { href: "/mod/edits", label: "Recent edits", icon: "edits", count: counts.edits },
    { href: "/mod/applications", label: "Applications", icon: "applications", count: counts.applications },
    { href: "/mod/announcements", label: "Announcements", icon: "announcements" },
    { href: "/mod/categories", label: "Categories", icon: "categories" },
    ...(viewer.role === "superadmin" ? [{ href: "/mod/users", label: "Users", icon: "users" as const }] : []),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
      <ModNav items={items} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
