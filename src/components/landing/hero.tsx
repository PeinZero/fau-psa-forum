import { Check, PenLine, Search } from "lucide-react";
import Link from "next/link";

import { OpenSearchButton } from "@/components/thread/open-search-button";
import { SearchShortcut } from "@/components/thread/search-shortcut";
import { buttonClasses } from "@/components/ui/button";
import { type IntroVideo, introVideo } from "@/lib/site";

import { WatchIntroLink } from "./intro-video";

export const trustPoints = ["Moderated by students", "Verified guides", "Free and independent"] as const;

export function Hero({ video = introVideo }: { video?: IntroVideo | null }) {
  return (
    <section aria-labelledby="hero-heading" className="hero-spotlight flex flex-col items-center pt-12 text-center sm:pt-16 lg:pt-20">
      <p
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background/70 py-1 pr-3 pl-2.5 text-meta font-medium text-muted shadow-[0_1px_2px_var(--shadow-color)] backdrop-blur"
      >
        <span aria-hidden className="relative flex size-2 shrink-0">
          <span className="absolute inset-0 rounded-full bg-accent opacity-30 blur-[3px]" />
          <span className="relative size-2 rounded-full bg-accent" />
        </span>
        <span className="truncate">
          Pakistan Student Association<span className="text-subtle"> · </span>FAU Erlangen-Nürnberg
        </span>
      </p>

      <h1
        id="hero-heading"
        className="mt-2 max-w-[15em] text-[2.125rem] leading-[1.1] font-semibold tracking-[-0.035em] text-balance text-foreground sm:mt-2 sm:text-5xl sm:leading-[1.05] lg:text-[3.5rem]"
      >
        Answers for Pakistani students in Erlangen&nbsp;&amp;&nbsp;Nuremberg
      </h1>

      <p
        className="mt-5 max-w-[34rem] text-body text-pretty text-muted sm:mt-6 sm:text-[1.0625rem] sm:leading-7"
      >
        Residence permits, courses, housing and first steps, asked once and answered for everyone who comes next.
      </p>

      <div
        className="mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:items-center"
      >
        <Link href="/new" className={buttonClasses({ className: "min-h-11 px-5 text-body sm:min-h-11" })}>
          <PenLine strokeWidth={1.75} />
          Ask a question
        </Link>
        <OpenSearchButton
          className={buttonClasses({ variant: "secondary", className: "min-h-11 px-5 text-body sm:pr-3 sm:min-h-11" })}
        >
          <Search strokeWidth={1.75} className="text-muted" />
          Search threads
          {/* The hint appears after hydration; keeping room for ⌘K stops the centred buttons from sliding. */}
          <span className="ml-1.5 hidden min-w-[2.65rem] sm:inline-flex">
            <SearchShortcut className="inline-flex gap-0.5" />
          </span>
        </OpenSearchButton>
      </div>

      {video ? (
        <div className="mt-3 flex justify-center">
          <WatchIntroLink durationLabel={video.durationLabel} />
        </div>
      ) : null}

      <ul
        aria-label="Why trust the answers"
        className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-meta text-muted sm:mt-10"
      >
        {trustPoints.map((point) => (
          <li key={point} className="inline-flex items-center gap-1.5">
            <Check aria-hidden strokeWidth={2} className="size-3.5 text-accent" />
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}
