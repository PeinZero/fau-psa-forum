import { CalendarDays, MessageSquareCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { users } from "../demo-data";
import { affiliationLabels, Avatar } from "../../ui/avatar";
import { Badge, TopHelperBadge } from "../../ui/badge";

/*
 * The head of a public profile (src/app/u/[username]/page.tsx): initials tile, name, handle, the
 * affiliation and Top helper badges (10 or more best answers), then reputation, best answers and
 * the join date.
 */

export const PROFILE_CARD = { width: 440, height: 214 };

export function ProfileCard() {
  const user = users.erlangenHelper;
  return (
    <div className="absolute inset-0 bg-background px-8 pt-8">
      <header className="flex items-start gap-5">
        <Avatar name={user.displayName} size="lg" className="size-16! text-xl!" />
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-display font-semibold tracking-tight text-foreground">{user.displayName}</h1>
          <p className="break-all text-body text-muted">@{user.username}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {user.affiliation && <Badge>{affiliationLabels[user.affiliation]}</Badge>}
            <TopHelperBadge />
          </div>
          <dl className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-meta text-muted">
            <Stat icon={<Sparkles />} label="Reputation" value={user.reputation} />
            <Stat icon={<MessageSquareCheck />} label="Best answers" value={user.bestAnswerCount} />
            <div className="flex items-center gap-1.5">
              <CalendarDays aria-hidden strokeWidth={1.75} className="size-4 text-subtle" />
              <dd>
                Joined <time className="tabular-nums">2 Oct 2026</time>
              </dd>
            </div>
          </dl>
        </div>
      </header>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden className="text-subtle [&_svg]:size-4 [&_svg]:stroke-[1.75]">
        {icon}
      </span>
      <dd className="font-semibold tabular-nums text-foreground">{value}</dd>
      <dt>{label}</dt>
    </div>
  );
}
