import { Check, PenLine, Search } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { OpenSearchButton } from "@/components/thread/open-search-button";
import { SearchShortcut } from "@/components/thread/search-shortcut";
import { buttonClasses } from "@/components/ui/button";
import { stagger } from "@/components/ui/motion";
import { type IntroVideo, introVideo } from "@/lib/site";

import { PsaPill } from "./hero-announcement";
import { WatchIntroLink } from "./intro-video";

export const trustPoints = ["Moderated by students", "Verified guides", "Free and independent"] as const;

export function Hero({ video = introVideo, eyebrow = <PsaPill /> }: { video?: IntroVideo | null; eyebrow?: ReactNode }) {
  return (
    <section aria-labelledby="hero-heading" className="hero-spotlight flex flex-col items-center pt-12 text-center sm:pt-16 lg:pt-20">
      {eyebrow}

      <h1
        id="hero-heading"
        className="animate-fade-up mt-2 max-w-[15em] text-[2.125rem] leading-[1.1] font-semibold tracking-[-0.035em] text-balance text-foreground sm:mt-2 sm:text-5xl sm:leading-[1.05] lg:text-[3.5rem]"
        style={stagger(1)}
      >
        Answers for Pakistani students in Erlangen&nbsp;&amp;&nbsp;Nuremberg
      </h1>

      <p
        className="animate-fade-up mt-5 max-w-[34rem] text-body text-pretty text-muted sm:mt-6 sm:text-[1.0625rem] sm:leading-7"
        style={stagger(2)}
      >
        Residence permits, courses, housing and first steps, asked once and answered for everyone who comes next.
      </p>

      <div
        className="animate-fade-up mt-8 flex w-full flex-col gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:items-center"
        style={stagger(3)}
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
          <SearchShortcut className="ml-1.5 hidden gap-0.5 sm:inline-flex" />
        </OpenSearchButton>
      </div>

      {video ? (
        <div className="animate-fade-up mt-3 flex justify-center" style={stagger(4)}>
          <WatchIntroLink durationLabel={video.durationLabel} />
        </div>
      ) : null}

      <ul
        aria-label="Why trust the answers"
        className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-meta text-muted sm:mt-10"
        style={stagger(4)}
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
