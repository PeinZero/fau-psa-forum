import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function GuidesBackLink() {
  return (
    <Link
      href="/mod/guides"
      className="inline-flex min-h-8 items-center gap-1 justify-self-start rounded-md pr-2 text-meta font-medium text-muted transition-colors hover:text-foreground pointer-coarse:min-h-11"
    >
      <ChevronLeft aria-hidden strokeWidth={1.75} className="size-4" />
      All guides
    </Link>
  );
}
