import { ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/author";
import { buttonClasses } from "@/components/ui/button";

import { avatarOverflow, MODERATOR_AVATARS, moderatorApplyHref } from "./shape";

export type CommunityModerator = { id: string; display_name: string };

const panel =
  "relative isolate overflow-hidden rounded-2xl border border-border bg-surface px-5 py-8 sm:px-10 sm:py-10 " +
  "before:absolute before:inset-y-0 before:right-0 before:-z-10 before:w-2/3 before:bg-[radial-gradient(60%_80%_at_100%_0%,var(--glow),transparent_70%)]";

export function CommunityStripView({
  moderators,
  total,
  apply = <ModeratorApplyLink signedIn={false} />,
}: {
  moderators: readonly CommunityModerator[];
  total: number;
  /** The apply link depends on the session, so Home streams it in; it is the same size either way. */
  apply?: ReactNode;
}) {
  const shown = moderators.slice(0, MODERATOR_AVATARS);
  const extra = avatarOverflow(total, shown.length);
  return (
    <section aria-labelledby="community-heading" className={panel}>
      <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between md:gap-12">
        <div className="max-w-xl">
          <h2 id="community-heading" className="text-[1.375rem] leading-8 font-semibold tracking-[-0.02em] text-balance text-foreground sm:text-2xl">
            Run by students, for students
          </h2>
          <p className="mt-2 text-body text-pretty text-muted">
            Moderators are PSA members who review every question, keep answers current and verify the guides. Not
            affiliated with FAU, just students helping the next ones.
          </p>
          <Link
            href="/contributors"
            className="group/team mt-6 inline-flex items-center gap-4 rounded-full pr-2 text-small font-medium text-muted transition-colors duration-150 ease-out hover:text-foreground"
          >
            {shown.length > 0 && (
              <span aria-hidden className="flex -space-x-2.5">
                {shown.map((moderator) => (
                  <span key={moderator.id} title={moderator.display_name} className="rounded-full ring-[3px] ring-surface">
                    <Avatar name={moderator.display_name} size="md" />
                  </span>
                ))}
                {extra > 0 && (
                  <span className="flex size-10 items-center justify-center rounded-full border border-border bg-raised text-meta font-semibold tabular-nums text-muted ring-[3px] ring-surface">
                    +{extra}
                  </span>
                )}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              {total > 1 ? `Meet the ${total} moderators` : "Meet the team"}
              <ArrowRight
                aria-hidden
                strokeWidth={1.75}
                className="size-4 transition-transform duration-150 ease-out group-hover/team:translate-x-0.5"
              />
            </span>
          </Link>
        </div>
        {apply}
      </div>
    </section>
  );
}

export function ModeratorApplyLink({ signedIn }: { signedIn: boolean }) {
  return (
    <Link
      href={moderatorApplyHref(signedIn)}
      className={buttonClasses({ variant: "secondary", className: "min-h-11 self-start px-5 text-body md:self-center" })}
    >
      <ShieldCheck strokeWidth={1.75} className="text-accent" />
      Become a moderator
    </Link>
  );
}
