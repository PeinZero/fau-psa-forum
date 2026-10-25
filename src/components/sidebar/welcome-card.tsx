import { Bell, Bookmark, LogIn, PenLine, UserRound } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth/viewer";

import { cardClasses, cardHeading, cardRow, RowIcon } from "./card-styles";

const memberLinks = [
  { href: "/me/threads", label: "Your threads", icon: UserRound },
  { href: "/saved", label: "Saved threads", icon: Bookmark },
  { href: "/notifications", label: "Notifications", icon: Bell },
] as const;

function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] ?? displayName;
}

/**
 * The page headline already says what the forum is, so this card is about the visitor's next
 * step: asking, or signing in to take part; members get their own corners of the forum.
 */
export function WelcomeCardView({ viewer, className }: { viewer: { displayName: string } | null; className?: string }) {
  if (!viewer) {
    return (
      <section aria-labelledby="welcome-card-heading" className={cn(cardClasses, className)}>
        <h2 id="welcome-card-heading" className={cardHeading}>
          Have a question?
        </h2>
        <p className="mt-1 text-meta text-muted">
          Ask the community, or sign in to reply, vote and follow threads.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Link href="/new" className={buttonClasses({ className: "w-full" })}>
            <PenLine strokeWidth={1.75} />
            Ask a question
          </Link>
          <Link href="/login" className={buttonClasses({ variant: "ghost", className: "w-full text-foreground" })}>
            <LogIn strokeWidth={1.75} className="text-muted" />
            Sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="welcome-card-heading" className={cn(cardClasses, className)}>
      <h2 id="welcome-card-heading" className={cn(cardHeading, "truncate")}>
        Hi, {firstName(viewer.displayName)}
      </h2>
      <Link href="/new" className={buttonClasses({ className: "mt-3 w-full" })}>
        <PenLine strokeWidth={1.75} />
        Ask a question
      </Link>
      <ul className="mt-2 flex flex-col">
        {memberLinks.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className={cn(cardRow, "min-h-10 py-1.5")}>
              <RowIcon>
                <Icon strokeWidth={1.75} className="size-4" />
              </RowIcon>
              <span className="text-body font-medium text-foreground">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Reads the session, so render inside <Suspense> with `WelcomeCardSkeleton` as the fallback. */
export async function WelcomeCard({ className }: { className?: string }) {
  const viewer = await getViewer();
  return <WelcomeCardView viewer={viewer} className={className} />;
}

export function WelcomeCardSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" aria-busy="true" className={cn(cardClasses, className)}>
      <span className="sr-only">Loading…</span>
      <Skeleton className="my-1 h-4 w-32" />
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-4 h-9 w-full pointer-coarse:h-11" />
      <Skeleton className="mt-2 h-9 w-full pointer-coarse:h-11" />
    </div>
  );
}
