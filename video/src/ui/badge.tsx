import { Award, CircleCheck, Pin, ShieldCheck } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "./cn";

export type BadgeVariant = "neutral" | "accent" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-border bg-surface text-muted",
  accent: "border-accent/20 bg-accent-soft text-accent",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
};

/** The site's pill (src/components/ui/badge.tsx): 20px tall, 12px medium text, 12px icons. */
export function Badge({ variant = "neutral", className, ...props }: ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-xs font-medium [&_svg]:size-3",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export type StatusKind =
  | "answered"
  | "pinned"
  | "verified"
  | "pending"
  | "rejected"
  | "outdated"
  | "archived"
  | "best-answer";

/**
 * A status pill exactly as the site renders it: Answered, Pinned, "Verified Oct 2026",
 * "Waiting for review", Rejected, Outdated, Archived and "Best answer".
 */
export function StatusPill({
  kind,
  verifiedMonth = "Oct 2026",
  className,
}: {
  kind: StatusKind;
  /** Month shown by the Verified pill, formatted like the site ("Oct 2026"). */
  verifiedMonth?: string;
  className?: string;
}) {
  switch (kind) {
    case "answered":
      return (
        <Badge variant="accent" className={className}>
          <CircleCheck aria-hidden strokeWidth={1.75} />
          Answered
        </Badge>
      );
    case "pinned":
      return (
        <Badge variant="accent" className={className}>
          <Pin aria-hidden strokeWidth={1.75} />
          Pinned
        </Badge>
      );
    case "verified":
      return (
        <Badge variant="accent" className={className}>
          <ShieldCheck aria-hidden strokeWidth={1.75} />
          Verified <time>{verifiedMonth}</time>
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="warning" className={className}>
          Waiting for review
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="danger" className={className}>
          Rejected
        </Badge>
      );
    case "outdated":
      return (
        <Badge variant="warning" className={className}>
          Outdated
        </Badge>
      );
    case "archived":
      return <Badge className={className}>Archived</Badge>;
    case "best-answer":
      return (
        <Badge variant="accent" className={className}>
          <CircleCheck aria-hidden strokeWidth={1.75} />
          Best answer
        </Badge>
      );
  }
}

/** Shown on profiles of members with 10 or more best answers. */
export function TopHelperBadge({ className }: { className?: string }) {
  return (
    <Badge variant="accent" className={className}>
      <Award aria-hidden strokeWidth={1.75} />
      Top helper
    </Badge>
  );
}
