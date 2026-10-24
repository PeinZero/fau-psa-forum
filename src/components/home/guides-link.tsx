import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";

export function GuidesLink({ className }: { className?: string }) {
  return (
    <Link
      href="/guides"
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-surface/70 px-4 py-3 text-left backdrop-blur",
        "transition-[background-color,border-color] duration-200 ease-out hover:border-border-strong/50 hover:bg-surface-hover",
        className,
      )}
    >
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent-soft text-accent"
      >
        <BookOpen strokeWidth={1.75} className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body font-medium text-foreground">New here? Start with the guides</span>
        <span className="block text-meta text-muted">Anmeldung, blocked account, insurance and more, step by step.</span>
      </span>
      <ArrowRight
        aria-hidden
        strokeWidth={1.75}
        className="size-4 shrink-0 text-subtle transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
}
