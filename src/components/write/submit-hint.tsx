import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/components/ui/cn";

/** ⌘↵ / Ctrl↵ hint for mouse-and-keyboard users; `isApple` is null until hydration. */
export function SubmitHint({ isApple, className }: { isApple: boolean | null; className?: string }) {
  if (isApple === null) return null;
  return (
    <span
      aria-hidden
      className={cn("hidden items-center gap-1 text-meta text-subtle pointer-fine:inline-flex", className)}
    >
      <Kbd>{isApple ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>↵</Kbd>
    </span>
  );
}
