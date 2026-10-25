import { Sparkles } from "lucide-react";

import { Badge, TopHelperBadge } from "./badge";
import { cn } from "./cn";

/*
 * Initials on a tile, never photos: the site has no profile pictures and the film shows no faces.
 */

/** Initials as the site's content avatars compute them ("Erlangen helper" → "EH"). */
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

/**
 * Author avatar (src/components/author.tsx). The thread byline uses `size="sm"` with
 * `className="size-9 text-xs"`, comments `size-7 text-[11px]`, replies `size-6 text-[10px]`.
 */
export function Avatar({
  name,
  size = "sm",
  className,
}: {
  /** Display name; null renders "?" like a deleted user. */
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

/** Initials as the header's account menu computes them (also splits handles on . _ -). */
export function accountInitials(name: string): string {
  const words = name.replace(/@.*$/, "").split(/[\s._-]+/).filter(Boolean);
  const letters =
    words.length > 1 ? [words[0], words[1]].map((word) => Array.from(word)[0]) : Array.from(words[0] ?? "?").slice(0, 2);
  return letters.join("").toUpperCase();
}

/** The signed-in avatar in the header's account trigger: 32px emerald tile inside a 44px hit area. */
export function AccountAvatar({
  name,
  open = false,
  className,
}: {
  name: string;
  /** Menu open (or hovered): the ring thickens as on the site. */
  open?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex size-11 items-center justify-center rounded-full", className)}>
      <span
        aria-hidden
        className={cn(
          "flex size-8 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent",
          open ? "ring-2 ring-accent/50" : "ring-1 ring-accent/25",
        )}
      >
        {accountInitials(name)}
      </span>
    </span>
  );
}

export type Role = "member" | "moderator" | "superadmin";
export type Affiliation = "student" | "graduate" | "postgrad" | "resident";

export const affiliationLabels: Record<Affiliation, string> = {
  student: "Student",
  graduate: "Graduate",
  postgrad: "Postgrad",
  resident: "Resident",
};

/** Name, role badge (staff only) and affiliation badge, as in a byline or comment meta line. */
export function AuthorName({
  name,
  role = "member",
  affiliation = null,
  avatar = false,
  reputation,
  bestAnswerCount = 0,
}: {
  name: string;
  role?: Role;
  affiliation?: Affiliation | null;
  /** Small 24px avatar before the name, as in lists. */
  avatar?: boolean;
  /** Profile-like contexts only: reputation points, plus the Top helper badge from 10 best answers. */
  reputation?: number;
  bestAnswerCount?: number;
}) {
  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      {avatar && <Avatar name={name} />}
      <span className="break-words font-medium text-foreground">{name}</span>
      {role !== "member" && <Badge variant="accent">{role === "superadmin" ? "Superadmin" : "Moderator"}</Badge>}
      {affiliation && <Badge>{affiliationLabels[affiliation]}</Badge>}
      {reputation !== undefined && <ReputationScore points={reputation} />}
      {reputation !== undefined && bestAnswerCount >= 10 && <TopHelperBadge />}
    </span>
  );
}

/** Reputation points as profiles show them. */
export function ReputationScore({ points }: { points: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-meta text-muted tabular-nums">
      <Sparkles aria-hidden strokeWidth={1.75} className="size-4" />
      {points}
    </span>
  );
}
