"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { useIsApple } from "@/components/command/platform";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Kbd } from "@/components/ui/kbd";

export const OPEN_SHORTCUTS_EVENT = "open-shortcuts";

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

export function ShortcutsDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const apple = useIsApple();
  const mod = apple ? "⌘" : "Ctrl";

  useEffect(() => {
    function open() {
      const dialog = ref.current;
      if (dialog && !dialog.open) dialog.showModal();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (isTypingTarget(event.target) || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      open();
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, open);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, open);
    };
  }, []);

  const groups: { heading: string; rows: { keys: string[][]; label: string }[] }[] = [
    {
      heading: "General",
      rows: [
        { keys: [[mod, "K"], ["/"]], label: "Open search" },
        { keys: [["?"]], label: "Show this help" },
      ],
    },
    {
      heading: "In search",
      rows: [
        { keys: [["↑"], ["↓"]], label: "Move through results" },
        { keys: [["↵"]], label: "Open result" },
        { keys: [["Esc"]], label: "Close search" },
      ],
    },
    {
      heading: "Writing",
      rows: [
        { keys: [[mod, "↵"]], label: "Submit comment" },
        { keys: [["Esc"]], label: "Cancel edit" },
      ],
    },
  ];

  return (
    <dialog
      ref={ref}
      aria-labelledby="shortcuts-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
      className={cn(
        "m-auto w-[calc(100vw-2rem)] max-w-md rounded-xl border border-border bg-background p-0 text-foreground not-open:hidden dark:bg-surface",
        "shadow-[0_24px_64px_-12px_rgb(0_0_0/0.35),0_0_0_1px_var(--border)]",
        "backdrop:bg-black/30 backdrop:backdrop-blur-[3px] dark:backdrop:bg-black/60",
      )}
    >
      <div className="flex items-center justify-between border-b border-border py-2 pl-4 pr-2">
        <h2 id="shortcuts-title" className="text-sm font-medium">
          Keyboard shortcuts
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => ref.current?.close()}
          className={buttonClasses({ variant: "ghost", size: "icon" })}
        >
          <X strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto p-4">
        {groups.map((group) => (
          <section key={group.heading} aria-label={group.heading}>
            <h3 className="mb-2 text-meta font-medium text-muted">{group.heading}</h3>
            <ul className="flex flex-col gap-2">
              {group.rows.map((row) => (
                <li key={row.label} className="flex items-center justify-between gap-3 text-sm">
                  <span>{row.label}</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {row.keys.map((combo, i) => (
                      <span key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-meta text-subtle">or</span>}
                        <span className="flex gap-0.5">
                          {combo.map((key) => (
                            <Kbd key={key}>{key}</Kbd>
                          ))}
                        </span>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </dialog>
  );
}
