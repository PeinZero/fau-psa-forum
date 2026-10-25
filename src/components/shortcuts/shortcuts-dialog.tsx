"use client";

import { useEffect, useId, useRef } from "react";

import { useIsApple } from "@/components/command/platform";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

export const OPEN_SHORTCUTS_EVENT = "open-shortcuts";

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/** Each row lists alternative key combinations; keys inside one combination are pressed together. */
type Row = { label: string; combos: string[][] };
type Group = { heading: string; rows: Row[] };

export function shortcutGroups(mod: string): Group[] {
  return [
    {
      heading: "General",
      rows: [
        { label: "Search threads", combos: [[mod, "K"], ["/"]] },
        { label: "Show keyboard shortcuts", combos: [["?"]] },
      ],
    },
    {
      heading: "In search",
      rows: [
        { label: "Move through results", combos: [["↑", "↓"]] },
        { label: "Open the selected result", combos: [["↵"]] },
        { label: "See all results", combos: [[mod, "↵"]] },
        { label: "Close search", combos: [["Esc"]] },
      ],
    },
    {
      heading: "Writing",
      rows: [
        { label: "Post your comment", combos: [[mod, "↵"]] },
        { label: "Cancel editing", combos: [["Esc"]] },
      ],
    },
  ];
}

export function ShortcutsDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPress = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const apple = useIsApple();
  const groups = shortcutGroups(apple ? "⌘" : "Ctrl");

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

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        // Only a press that starts on the backdrop closes, not a text selection dragged out of the panel.
        if (backdropPress.current && event.target === event.currentTarget) event.currentTarget.close();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-background p-0 text-foreground shadow-[0_24px_48px_-12px_var(--shadow-color)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px] open:animate-fade-up"
    >
      <div className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1">
          <h2 id={titleId} className="text-base font-semibold tracking-tight">
            Keyboard shortcuts
          </h2>
          <p id={descriptionId} className="text-meta text-muted">
            Get around the forum without leaving the keyboard.
          </p>
        </div>

        {groups.map((group, groupIndex) => (
          <section key={group.heading} aria-labelledby={`${titleId}-${groupIndex}`}>
            <h3 id={`${titleId}-${groupIndex}`} className="mb-1 text-meta font-medium text-muted">
              {group.heading}
            </h3>
            <dl className="flex flex-col">
              {group.rows.map((row) => (
                <div key={row.label} className="flex min-h-9 items-center justify-between gap-4 text-sm">
                  <dt>{row.label}</dt>
                  <dd className="flex shrink-0 items-center gap-1.5 tabular-nums">
                    {row.combos.map((combo, index) => (
                      <span key={combo.join("+")} className="flex items-center gap-1.5">
                        {index > 0 && <span className="text-meta text-subtle">or</span>}
                        <span className="flex gap-0.5">
                          {combo.map((key) => (
                            <Kbd key={key}>{key}</Kbd>
                          ))}
                        </span>
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}

        <div className="flex justify-end">
          <Button variant="secondary" onClick={() => ref.current?.close()}>
            Done
          </Button>
        </div>
      </div>
    </dialog>
  );
}
