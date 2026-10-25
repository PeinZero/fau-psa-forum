import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/components/ui/cn";

/** One block of the landing page: a real heading, an optional line of context and a "see all" link. */
export function LandingSection({
  id,
  title,
  description,
  link,
  children,
  busy = false,
  className,
}: {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  link?: { href: string; label: string };
  children: ReactNode;
  /** Set on the loading skeleton, which keeps the real heading so nothing shifts when data arrives. */
  busy?: boolean;
  className?: string;
}) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} aria-busy={busy || undefined} className={className}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 sm:mb-8">
        <div className="min-w-0 max-w-2xl">
          <h2 id={headingId} className="text-[1.375rem] leading-8 font-semibold tracking-[-0.02em] text-balance text-foreground sm:text-2xl">
            {title}
          </h2>
          {description && <p className="mt-1.5 text-body text-pretty text-muted">{description}</p>}
        </div>
        {link && <SectionLink href={link.href}>{link.label}</SectionLink>}
      </div>
      {children}
    </section>
  );
}

export function SectionLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/link -mx-2 inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-small font-medium text-muted transition-colors duration-150 ease-out hover:text-foreground pointer-coarse:min-h-11",
        className,
      )}
    >
      {children}
      <ArrowRight
        aria-hidden
        strokeWidth={1.75}
        className="size-4 transition-transform duration-150 ease-out group-hover/link:translate-x-0.5"
      />
    </Link>
  );
}

/** The arrow at the end of a card; it nudges right when the card is hovered. */
export function CardArrow({ className }: { className?: string }) {
  return (
    <ArrowRight
      aria-hidden
      strokeWidth={1.75}
      className={cn(
        "size-4 shrink-0 text-subtle transition-[color,translate] duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-accent",
        className,
      )}
    />
  );
}
