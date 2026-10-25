import { Bookmark } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";

/** Entry point to /saved for account menus and the account page. */
export function SavedLink({ className }: { className?: string }) {
  return (
    <Link
      href="/saved"
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-small text-foreground transition-colors duration-150 hover:bg-surface-hover pointer-coarse:min-h-11 [&_svg]:size-4 [&_svg]:text-muted",
        className,
      )}
    >
      <Bookmark aria-hidden strokeWidth={1.75} />
      Saved threads
    </Link>
  );
}
