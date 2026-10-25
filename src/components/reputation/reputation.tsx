import { Award, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

/** Best answers needed for the "Top helper" badge. */
export const TOP_HELPER_THRESHOLD = 10;

export function isTopHelper(bestAnswerCount: number | null | undefined): boolean {
  return (bestAnswerCount ?? 0) >= TOP_HELPER_THRESHOLD;
}

export function ReputationScore({ points }: { points: number | null | undefined }) {
  if (points == null) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-meta tabular-nums text-muted"
      title={`${points} reputation`}
      aria-label={`${points} reputation`}
    >
      <Sparkles aria-hidden strokeWidth={1.75} className="size-4" />
      {points}
    </span>
  );
}

export function TopHelperBadge() {
  return (
    <Badge variant="accent">
      <Award aria-hidden strokeWidth={1.75} />
      Top helper
    </Badge>
  );
}
