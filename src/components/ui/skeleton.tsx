import { cn } from "./cn";

/** Size it with className, e.g. `<Skeleton className="h-4 w-40" />`. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} />;
}
