"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buttonClasses } from "@/components/ui/button";

/** Reads `?deleted=1`; must render inside <Suspense> because search params are request-time data. */
export function DeletedNotice() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (searchParams.get("deleted") !== "1") return null;

  function dismiss() {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("deleted");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface py-1 pl-4 pr-1 text-small text-foreground"
    >
      <p>Your account was deleted.</p>
      <button
        type="button"
        aria-label="Dismiss notice"
        onClick={dismiss}
        className={buttonClasses({ variant: "ghost", size: "icon" })}
      >
        <X strokeWidth={1.75} />
      </button>
    </div>
  );
}
