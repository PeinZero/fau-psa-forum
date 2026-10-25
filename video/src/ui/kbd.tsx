import type { ComponentProps } from "react";

import { cn } from "./cn";

/** A key cap, e.g. `<Kbd>⌘</Kbd><Kbd>K</Kbd>`. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center gap-0.5 rounded border border-border bg-background px-1 font-sans text-[11px] font-medium text-muted",
        className,
      )}
      {...props}
    />
  );
}
