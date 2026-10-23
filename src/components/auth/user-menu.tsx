import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { getModCounts } from "@/components/mod/counts";

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

  const counts = viewer.role === "member" ? null : await getModCounts();
  const pending = counts ? counts.threads + counts.applications + counts.reports : 0;

  return (
    <div className="flex items-center gap-1">
      {viewer.role !== "member" && (
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
      <Link
        href="/account"
        title={viewer.displayName}
        className="group inline-flex size-11 items-center max-[399px]:pointer-coarse:size-10 justify-center rounded-full"
      >
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent ring-1 ring-accent/25 transition-shadow duration-150 group-hover:ring-accent/50"
        >
          {initials(viewer.displayName)}
        </span>
        <span className="sr-only">Account: {viewer.displayName}</span>
      </Link>
    </div>
  );
}
