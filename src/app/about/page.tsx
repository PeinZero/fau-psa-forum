import {
  BookOpenCheck,
  Code2,
  GitPullRequest,
  Lock,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { stagger } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "About",
  description:
    "A moderator-curated Q&A forum for Pakistani students at FAU Erlangen-Nürnberg.",
};

const REPO = "https://github.com/PeinZero/fau-psa-forum";

const sections: { icon: LucideIcon; title: string; body: React.ReactNode }[] = [
  {
    icon: BookOpenCheck,
    title: "What this is",
    body: (
      <>
        <p>
          The same questions keep coming up in the WhatsApp groups: residence
          permit and visa, courses, housing, jobs, and what to do first in
          Erlangen and Nuremberg. This forum collects the answers once, curated
          by moderators, so they can be found instead of asked again.
        </p>
      </>
    ),
  },
  {
    icon: GitPullRequest,
    title: "How it works",
    body: (
      <ul className="list-disc space-y-1 pl-5 marker:text-subtle">
        <li>Read everything freely, no account needed.</li>
        <li>Sign in to post threads and comments.</li>
        <li>Moderators review every new thread before it goes public.</li>
        <li>
          Outdated answers are marked or archived, and any thread or comment can
          be reported.
        </li>
      </ul>
    ),
  },
  {
    icon: Users,
    title: "Who runs it",
    body: (
      <p>
        Founded by Mahad Khalid Tarar, with co-founder Abdul Moeez, and built
        for the Pakistan Student Association community at FAU. Moderators are
        volunteers from that community.
      </p>
    ),
  },
  {
    icon: ShieldCheck,
    title: "Become a moderator",
    body: (
      <p>
        Know the answers and have a little time? Apply from your{" "}
        <Link
          href="/account"
          className="font-medium text-accent underline underline-offset-2"
        >
          account page
        </Link>
        .
      </p>
    ),
  },
  {
    icon: Code2,
    title: "Open source",
    body: (
      <p>
        The code is MIT licensed on{" "}
        <a
          href={REPO}
          className="font-medium text-accent underline underline-offset-2"
        >
          GitHub
        </a>
        . Pull requests are welcome; see the{" "}
        <Link
          href="/contributors"
          className="font-medium text-accent underline underline-offset-2"
        >
          contributors
        </Link>
        .
      </p>
    ),
  },
  {
    icon: Lock,
    title: "Privacy",
    body: (
      <p>
        We keep minimal data: no ads, no tracking. Details are in the{" "}
        <Link
          href="/privacy"
          className="font-medium text-accent underline underline-offset-2"
        >
          privacy policy
        </Link>
        .
      </p>
    ),
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-4 sm:py-10">
      <header className="hero-glow mb-14 text-center">
        <h1 className="animate-fade-up text-balance text-display font-semibold tracking-tight sm:text-5xl sm:leading-[1.1]">
          Answers, written down once.
        </h1>
        <p
          className="animate-fade-up mx-auto mt-4 max-w-xl text-balance text-body text-muted"
          style={stagger(1)}
        >
          A moderator-curated forum for Pakistani students at FAU
          Erlangen-Nürnberg.
        </p>
        <div
          className="animate-fade-up mt-7 flex justify-center gap-2"
          style={stagger(2)}
        >
          <Link href="/" className={buttonClasses()}>
            Browse threads
          </Link>
          <Link
            href="/contributors"
            className={buttonClasses({ variant: "secondary" })}
          >
            Contributors
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ icon: Icon, title, body }, i) => (
          <Card
            key={title}
            className="animate-fade-up space-y-3"
            style={stagger(i + 3)}
          >
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-accent"
            >
              <Icon className="size-4" strokeWidth={1.75} />
            </span>
            <h2 className="text-heading">{title}</h2>
            <div className="space-y-2 text-body text-muted">
              {body}
            </div>
          </Card>
        ))}
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-meta text-muted">
        PSA FAU Community Forum is an independent student project founded by
        Mahad Khalid Tarar and co-founded by Abdul Moeez. It is not affiliated with,
        endorsed by or operated by Friedrich-Alexander-Universität
        Erlangen-Nürnberg (FAU). Answers here come from students and are not
        official university advice. For binding information, check with FAU or
        the relevant authority.
      </p>
    </div>
  );
}
