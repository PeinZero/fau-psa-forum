import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "./button";
import { cn } from "./cn";

export const PAGE_SIZE = 20;

/** Reads `?page=` (1-based) defensively; anything invalid is page 1. */
export function parsePage(value: string | string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isSafeInteger(page) && page > 1 ? page : 1;
}

function hrefFor(path: string, params: Record<string, string | undefined>, page: number): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Previous / next links with "Page X of Y"; renders nothing for a single page. */
export function Pagination({
  path,
  params = {},
  page,
  total,
  pageSize = PAGE_SIZE,
  className,
}: {
  path: string;
  params?: Record<string, string | undefined>;
  page: number;
  total: number;
  pageSize?: number;
  className?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const current = Math.min(page, pages);

  return (
    <nav aria-label="Pagination" className={cn("mt-6 flex items-center justify-between gap-3", className)}>
      {current > 1 ? (
        <Link href={hrefFor(path, params, current - 1)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
          <ChevronLeft aria-hidden strokeWidth={1.75} />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <p className="text-meta text-muted">
        Page {current} of {pages}
      </p>
      {current < pages ? (
        <Link href={hrefFor(path, params, current + 1)} className={buttonClasses({ variant: "secondary", size: "sm" })}>
          Next
          <ChevronRight aria-hidden strokeWidth={1.75} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
