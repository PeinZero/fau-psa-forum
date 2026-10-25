"use client";

import { ArrowRight, Megaphone, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { cn } from "@/components/ui/cn";

import { BAR_ID, parseDismissed, readDismissedRaw, rememberDismissed } from "./announcement-bar-storage";

const COLLAPSE_MS = 200;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export type AnnouncementBarProps = { id: number; href: string; title: string; isPinned: boolean };

/**
 * The server HTML is visible; an inline script marks `data-dismissed` before paint for returning
 * dismissers, so there is neither a flash of the bar nor a layout shift for everyone else.
 */
export function AnnouncementBarClient({ id, href, title, isPinned }: AnnouncementBarProps) {
  const stored = useSyncExternalStore(subscribe, readDismissedRaw, () => null);
  const [closing, setClosing] = useState(false);
  const [gone, setGone] = useState(false);

  if (gone || (!closing && parseDismissed(stored).includes(id))) return null;

  const dismiss = () => {
    rememberDismissed(id);
    setClosing(true);
    window.setTimeout(() => {
      setGone(true);
      listeners.forEach((listener) => listener());
    }, COLLAPSE_MS);
  };

  return (
    <div
      id={BAR_ID}
      data-state={closing ? "closing" : "open"}
      aria-hidden={closing || undefined}
      inert={closing || undefined}
      className={cn(
        "grid border-b border-accent/25 bg-accent-soft transition-[grid-template-rows,opacity] duration-200 ease-out data-[dismissed]:hidden",
        closing ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
      )}
    >
      <div className="overflow-hidden">
        <div className="mx-auto flex min-h-10 w-full max-w-6xl items-center gap-2 px-4 sm:px-6 pointer-coarse:min-h-11">
          <Link
            href={href}
            className="group flex min-w-0 flex-1 items-center gap-2.5 self-stretch text-small text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Megaphone aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-accent" />
            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-meta leading-none font-semibold tracking-wide text-accent-foreground uppercase">
              {isPinned ? "Pinned" : "New"}
            </span>
            <span className="min-w-0 truncate font-medium">{title}</span>
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-accent">
              Read
              <ArrowRight aria-hidden strokeWidth={2} className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="-mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent/15 hover:text-foreground focus-visible:outline-2 focus-visible:outline-accent pointer-coarse:size-11"
          >
            <X aria-hidden strokeWidth={1.75} className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
