import { ArrowRight, PenLine } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";

export function ClosingCta() {
  return (
    <section aria-labelledby="closing-heading" className="hero-glow flex flex-col items-center text-center">
      <h2
        id="closing-heading"
        className="max-w-xl text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-4xl sm:leading-[1.1]"
      >
        Didn&apos;t find your answer?
      </h2>
      <p className="mt-3 max-w-md text-body text-pretty text-muted sm:mt-4">
        Ask it once. A moderator reviews it, the community answers, and the next student finds it here.
      </p>
      <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link href="/new" className={buttonClasses({ className: "min-h-11 px-5 text-body" })}>
          <PenLine strokeWidth={1.75} />
          Ask a question
        </Link>
        <Link href="/browse" className={buttonClasses({ variant: "ghost", className: "min-h-11 px-5 text-body text-foreground" })}>
          Browse questions
          <ArrowRight strokeWidth={1.75} className="text-muted" />
        </Link>
      </div>
    </section>
  );
}
