import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { AccountMenu } from "@/components/notification-settings/account-menu";
import { getModCounts } from "@/components/mod/counts";
import { buttonClasses } from "@/components/ui/button";
import { getViewer, getViewMode } from "@/lib/auth/viewer";

function initials(name: string): string {
  const words = name.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[1]].map((word) => Array.from(word)[0]) : Array.from(words[0] ?? "?").slice(0, 2);
  return letters.join("").toUpperCase();
}

export default async function UserMenu() {
  const viewer = await getViewer();

  if (!viewer) {
    return (
      <Link href="/login" className={buttonClasses({ variant: "secondary", size: "sm", className: "ml-1" })}>
        Sign in
      </Link>
    );
  }

  const isMod = viewer.role !== "member";
  const [counts, viewMode] = isMod ? await Promise.all([getModCounts(), getViewMode()]) : [null, "default"];
  const pending = counts ? counts.threads + counts.applications + counts.reports + counts.updates : 0;

  return (
    <div className="flex items-center gap-1">
      {isMod && (
        <Link
          href="/mod"
          aria-label={pending > 0 ? `Moderation, ${pending} pending` : "Moderation"}
          className={buttonClasses({
            variant: "ghost",
            size: "sm",
            className:
              "relative px-2.5 pointer-coarse:min-w-11 max-[399px]:size-9 max-[399px]:px-0 max-[399px]:pointer-coarse:size-10!",
          })}
        >
          <ShieldCheck strokeWidth={1.75} aria-hidden />
          <span aria-hidden className="max-lg:hidden">Moderation</span>
          {pending > 0 && (
            <span
              aria-hidden
              className="min-w-4 rounded-full bg-accent px-1.5 text-center text-[11px] font-semibold leading-4 tabular-nums text-accent-foreground max-[399px]:absolute max-[399px]:right-0 max-[399px]:top-0 max-[399px]:px-1 max-[399px]:ring-2 max-[399px]:ring-background"
            >
              {pending}
            </span>
          )}
        </Link>
      )}
      <AccountMenu
        displayName={viewer.displayName}
        initials={initials(viewer.displayName)}
        moderator={isMod}
        viewingAsMember={viewMode === "member"}
      />
    </div>
  );
}
