"use client";

import { Search } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { CommandPalette } from "@/components/command/command-palette";
import { useIsApple } from "@/components/command/platform";
import { cn } from "@/components/ui/cn";
import { Kbd } from "@/components/ui/kbd";

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** Input-looking button from md up, icon button below; both open the command palette. */
export function HeaderSearch({ canModerate }: { canModerate: boolean }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const apple = useIsApple();

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    const toggle = (event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k";
    const slash =
      event.key === "/" && !open && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditable(event.target);
    if (!toggle && !slash) return;
    event.preventDefault();
    setOpen(toggle ? !open : true);
  });

  useEffect(() => {
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-keyshortcuts="Meta+K Control+K /"
        className={cn(
          "group inline-flex shrink-0 items-center justify-center rounded-md text-muted",
          "transition-[background-color,border-color,color] duration-150 ease-out",
          "size-9 hover:bg-surface-hover hover:text-foreground active:bg-surface-hover pointer-coarse:size-11",
          "md:h-8 md:w-56 md:justify-start md:gap-2 md:border md:border-border md:bg-surface md:pl-2.5 md:pr-1.5 md:text-meta md:text-subtle",
          "md:hover:bg-surface-hover md:hover:text-muted md:pointer-coarse:h-11",
        )}
      >
        <Search aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
        <span className="max-md:sr-only">Search threads…</span>
        {apple !== null ? (
          <span aria-hidden className="ml-auto hidden gap-0.5 opacity-80 transition-opacity duration-150 ease-out group-hover:opacity-100 md:flex">
            <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>K</Kbd>
          </span>
        ) : null}
      </button>
      <CommandPalette open={open} onClose={() => setOpen(false)} canModerate={canModerate} triggerRef={triggerRef} />
    </>
  );
}
