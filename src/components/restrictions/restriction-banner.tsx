import { Ban, VolumeX } from "lucide-react";

import { cn } from "@/components/ui/cn";
import { getViewer } from "@/lib/auth/viewer";
import { type Restriction, restrictionHeadline, restrictionScope } from "@/lib/restrictions";

import { getOwnRestriction } from "./data";

/** Tells a muted or banned member why and until when, where they would otherwise post. */
export function RestrictionBanner({ restriction, className }: { restriction: Restriction; className?: string }) {
  const Icon = restriction.kind === "ban" ? Ban : VolumeX;
  return (
    <div
      role="status"
      className={cn(
        "flex gap-3 rounded-lg border border-danger/25 bg-danger/[0.06] px-4 py-3 text-meta",
        className,
      )}
    >
      <Icon aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-danger" />
      <div className="min-w-0">
        <p className="font-medium text-foreground">{restrictionHeadline(restriction)}</p>
        <p className="mt-0.5 break-words text-muted">
          <span className="font-medium text-foreground">Reason:</span> {restriction.reason}
        </p>
        <p className="mt-1 text-muted">{restrictionScope(restriction.kind)}</p>
      </div>
    </div>
  );
}

/** The signed-in member's banner; renders nothing for visitors and unrestricted accounts. Reads cookies. */
export async function ViewerRestrictionBanner({ className }: { className?: string }) {
  const viewer = await getViewer();
  const restriction = viewer ? await getOwnRestriction(viewer.userId) : null;
  return restriction ? <RestrictionBanner restriction={restriction} className={className} /> : null;
}
