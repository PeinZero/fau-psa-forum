import { ArrowRight, Megaphone } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { stagger } from "@/components/ui/motion";

export type LandingAnnouncement = {
  href: string;
  title: string;
  is_pinned: boolean;
};

/** Both eyebrow variants fill this box, so the headline stays put while the announcement loads. */
const slot = "flex min-h-[4.5rem] w-full flex-col items-center justify-center";

export function PsaPill() {
  return (
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
  );
}

/** The newest announcement leads the hero; the association's name steps back to a quiet line. Without one, the PSA pill stays. */
export function HeroEyebrowView({ announcement }: { announcement: LandingAnnouncement | null }) {
  if (!announcement) {
    return (
      <div className={cn(slot, "animate-fade-in")} style={stagger(0)}>
        <PsaPill />
      </div>
    );
  }
  return (
    <div className={cn(slot, "animate-fade-in gap-2")} style={stagger(0)}>
      <Link
        href={announcement.href}
        className="group inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-full border border-accent/25 bg-accent-soft py-1 pr-3.5 pl-3 text-small text-foreground shadow-[0_1px_2px_var(--shadow-color)] transition-colors hover:border-accent/50 hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Megaphone aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-accent" />
        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-meta font-semibold text-white uppercase tracking-wide">
          {announcement.is_pinned ? "Pinned" : "New"}
        </span>
        <span className="min-w-0 truncate font-medium">{announcement.title}</span>
        <span className="inline-flex shrink-0 items-center gap-1 font-medium text-accent">
          Read
          <ArrowRight aria-hidden strokeWidth={2} className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </Link>
      <p className="text-meta text-subtle">
        Pakistan Student Association<span> · </span>FAU Erlangen-Nürnberg
      </p>
    </div>
  );
}

export function HeroEyebrowSkeleton() {
  return <div aria-hidden className={slot} />;
}
