import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function SectionHeader({
  id,
  title,
  href,
  linkLabel,
}: {
  id: string;
  title: string;
  href: string;
  /** Visible text stays short ("See all"); screen readers hear what it opens. */
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="text-sm font-medium text-muted">
        {title}
      </h2>
      <Link
        href={href}
        aria-label={linkLabel}
        className="-mr-2 inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-meta font-medium text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-foreground pointer-coarse:min-h-11"
      >
        See all
        <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
      </Link>
    </div>
  );
}
