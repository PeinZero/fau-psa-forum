import { Briefcase, Footprints, GraduationCap, Hash, House, type LucideIcon, MessagesSquare, Stamp } from "lucide-react";

import { cn } from "./cn";

const icons: Record<string, LucideIcon> = {
  "rp-visa": Stamp,
  courses: GraduationCap,
  accommodation: House,
  jobs: Briefcase,
  "first-steps": Footprints,
  other: MessagesSquare,
};

/** The bare category icon, e.g. beside a category name in a meta line (`className="size-3.5"`). */
export function CategoryGlyph({ slug, className }: { slug: string; className?: string }) {
  const Icon = icons[slug] ?? Hash;
  return <Icon aria-hidden className={cn("size-4 shrink-0", className)} strokeWidth={1.75} />;
}

/** The 36px outlined category tile used in category lists. */
export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = icons[slug] ?? Hash;
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted",
        className,
      )}
    >
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}
