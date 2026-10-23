import { isTopHelper, ReputationScore, TopHelperBadge } from "@/components/reputation/reputation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { affiliationLabels } from "@/lib/labels";
import type { Tables } from "@/lib/supabase/database.types";

type AuthorProfile = Pick<Tables<"profiles">, "display_name" | "affiliation" | "role"> & {
  reputation?: number;
  best_answer_count?: number;
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

const avatarSizes = {
  sm: "size-6 border-border bg-surface-hover text-[10px] font-semibold tracking-normal text-muted",
  md: "size-10 border-accent/20 bg-accent-soft text-sm font-semibold text-accent",
  lg: "size-14 border-accent/20 bg-accent-soft text-lg font-semibold text-accent",
};

export function Avatar({
  name,
  size = "sm",
  className,
}: {
  name: string | null;
  size?: keyof typeof avatarSizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 select-none items-center justify-center rounded-full border",
        avatarSizes[size],
        className,
      )}
    >
      {name ? initials(name) : "?"}
    </span>
  );
}

/** `showReputation` is for profile-like contexts only; threads and comments stay free of scores. */
export function Author({
  profile,
  avatar = true,
  showReputation = false,
}: {
  profile: AuthorProfile | null;
  avatar?: boolean;
  showReputation?: boolean;
}) {
  if (!profile) {
    return (
      <span className="inline-flex items-center gap-2 text-muted">
        {avatar && <Avatar name={null} />}
        Deleted user
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {avatar && <Avatar name={profile.display_name} />}
      <span className="break-words font-medium text-foreground">{profile.display_name}</span>
      {profile.role !== "member" && (
        <Badge variant="accent">{profile.role === "superadmin" ? "Superadmin" : "Moderator"}</Badge>
      )}
      {profile.affiliation && <Badge>{affiliationLabels[profile.affiliation]}</Badge>}
      {showReputation && <ReputationScore points={profile.reputation} />}
      {showReputation && isTopHelper(profile.best_answer_count) && <TopHelperBadge />}
    </span>
  );
}
