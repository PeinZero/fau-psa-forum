import { ImageOff } from "lucide-react";
import type { CSSProperties } from "react";

import { cn } from "@/components/ui/cn";

/** Stands in for a file that will not load (deleted, or the media Worker is down) in the image's own frame. */
export function ImageUnavailable({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-lg bg-surface px-3 text-center text-meta text-muted outline -outline-offset-1 outline-border",
        className,
      )}
    >
      <ImageOff aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-subtle" />
      Image unavailable
    </div>
  );
}
