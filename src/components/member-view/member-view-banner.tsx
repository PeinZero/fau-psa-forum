import { Eye } from "lucide-react";

import { getViewer, getViewMode, isModerator } from "@/lib/auth/viewer";

import { SwitchBackButton } from "./switch-back-button";

/** Reminds a moderator that moderation controls and hidden comments are out of sight. */
export async function MemberViewBanner({ className }: { className?: string }) {
  const viewer = await getViewer();
  if (!viewer || !isModerator(viewer.role) || (await getViewMode()) !== "member") return null;

  return (
    <div className={className}>
      <p
        role="status"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-meta text-muted"
      >
        <Eye aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-subtle" />
        <span>You&rsquo;re viewing as a member</span>
        <span aria-hidden className="text-subtle">·</span>
        <SwitchBackButton />
      </p>
    </div>
  );
}
