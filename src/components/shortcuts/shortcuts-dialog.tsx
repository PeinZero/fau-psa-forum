"use client";

import { useEffect, useId, useState } from "react";

import { useIsApple } from "@/components/command/platform";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions, DialogHeader } from "@/components/ui/dialog";
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
  const [open, setOpen] = useState(false);
  const sectionId = useId();
  const apple = useIsApple();
  const groups = shortcutGroups(apple ? "⌘" : "Ctrl");

  useEffect(() => {
    function show() {
      setOpen(true);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "?" || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      if (isTypingTarget(event.target) || document.querySelector("dialog[open]")) return;
      event.preventDefault();
      show();
    }
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_SHORTCUTS_EVENT, show);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_SHORTCUTS_EVENT, show);
    };
  }, []);

  const close = () => setOpen(false);

  return (
    <Dialog open={open} onClose={close}>
      <DialogHeader title="Keyboard shortcuts" description="Get around the forum without leaving the keyboard." />

      {groups.map((group, groupIndex) => (
        <section key={group.heading} aria-labelledby={`${sectionId}-${groupIndex}`}>
          <h3 id={`${sectionId}-${groupIndex}`} className="mb-1 text-meta font-medium text-muted">
            {group.heading}
          </h3>
          <dl className="flex flex-col">
            {group.rows.map((row) => (
              <div key={row.label} className="flex min-h-9 items-center justify-between gap-4 text-small">
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

      <DialogActions>
        <Button variant="secondary" onClick={close}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
