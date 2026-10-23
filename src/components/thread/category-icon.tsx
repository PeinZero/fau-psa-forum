import {
  Briefcase,
  Footprints,
  GraduationCap,
  Hash,
  House,
  type LucideIcon,
  MessagesSquare,
  Stamp,
} from "lucide-react";

import { cn } from "@/components/ui/cn";

const icons: Record<string, LucideIcon> = {
  "rp-visa": Stamp,
  courses: GraduationCap,
  accommodation: House,
  jobs: Briefcase,
  "first-steps": Footprints,
  other: MessagesSquare,
};

/** Moderators can create categories at any time; unknown slugs get a neutral icon. */
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
