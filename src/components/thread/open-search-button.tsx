"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { OPEN_COMMAND_PALETTE } from "@/components/command/command-palette";

/** Opens the command palette; without JavaScript, or with a modifier key, it is a link to /search. */
export function OpenSearchButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Link
      href="/search"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const handled = !window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE, { cancelable: true }));
        if (handled) event.preventDefault();
      }}
      className={className}
    >
      {children}
    </Link>
  );
}
