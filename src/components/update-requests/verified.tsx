import { History, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";

const monthFormat = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "Europe/Berlin" });

export function VerifiedBadge({ at }: { at: string }) {
  return (
    <Badge variant="accent" title="Checked by moderators">
      <ShieldCheck aria-hidden strokeWidth={1.75} />
      Verified <time dateTime={at}>{monthFormat.format(new Date(at))}</time>
      <span className="sr-only">, checked by moderators</span>
    </Badge>
  );
}

const STALE_MONTHS = 6;

export type VerifiableThread = { status: string; created_at: string; last_verified_at: string | null };

/**
 * Bureaucracy answers (residence permits, Anmeldung, insurance) drift over time, so older published
 * threads that nobody has re-checked get a soft hint. Distinct from the moderators' Outdated flag.
 */
export function needsVerificationHint(
  { status, created_at, last_verified_at }: VerifiableThread,
  now: number = Date.now(),
): boolean {
  if (status !== "published") return false;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - STALE_MONTHS);
  const checkedAt = new Date(last_verified_at ?? created_at);
  return new Date(created_at) < cutoff && checkedAt < cutoff;
}

export function UnverifiedHint() {
  return (
    <span className="inline-flex items-center gap-1 text-meta text-muted">
      <History aria-hidden strokeWidth={1.75} className="size-3.5" />
      Not verified in over {STALE_MONTHS} months
    </span>
  );
}
