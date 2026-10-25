import { LogIn, Search } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";

function loginHref(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** Inline sentence for places that already frame the message, e.g. inside an EmptyState. */
export function SignInPrompt({ next, purpose }: { next: string; purpose: string }) {
  return (
    <p>
      Please{" "}
      <Link href={loginHref(next)} className="font-medium text-accent underline-offset-2 hover:underline">
        sign in
      </Link>{" "}
      {purpose}
    </p>
  );
}

/** A page's whole content when it needs an account: what for, and the way in. */
export function SignInCard({ next, title, description }: { next: string; title: string; description: string }) {
  return (
    <section
      aria-labelledby="sign-in-card-title"
      className="flex animate-fade-up flex-col items-center rounded-xl bg-surface px-6 py-10 text-center sm:py-12"
    >
      <span
        aria-hidden
        className="mb-4 flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent [&_svg]:size-5"
      >
        <LogIn strokeWidth={1.75} />
      </span>
      <h2 id="sign-in-card-title" className="text-heading font-semibold text-foreground">
        {title}
      </h2>
      <p className="mt-1.5 max-w-sm text-body text-muted">{description}</p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
        <Link href={loginHref(next)} className={buttonClasses()}>
          Sign in
        </Link>
        <Link href="/search" className={buttonClasses({ variant: "ghost" })}>
          <Search strokeWidth={1.75} />
          Search threads
        </Link>
      </div>
    </section>
  );
}
