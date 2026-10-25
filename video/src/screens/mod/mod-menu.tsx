import { Archive, CircleCheck, Link2, type LucideIcon, MoreHorizontal, Pencil, Pin, ShieldCheck, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";

import { buttonClasses } from "../../ui/button";
import { cn } from "../../ui/cn";

/*
 * The ⋯ menus a moderator opens on a thread and on a comment (src/components/ui/dropdown-menu.tsx
 * with the entries of src/components/mod/thread-mod-panel.tsx and comment-mod-actions.tsx). Only
 * curating entries are shown: no report, hide or mute entries.
 */

export type MenuEntry = { label: string; icon: LucideIcon } | "separator";

export const commentModMenu: MenuEntry[] = [
  { label: "Copy link", icon: Link2 },
  "separator",
  { label: "Mark best answer", icon: CircleCheck },
];

export const threadModMenu: MenuEntry[] = [
  { label: "Edit", icon: Pencil },
  { label: "Copy link", icon: Link2 },
  "separator",
  { label: "Pin", icon: Pin },
  { label: "Mark as outdated", icon: TriangleAlert },
  { label: "Mark as verified", icon: ShieldCheck },
  { label: "Archive", icon: Archive },
];

/* Panel geometry in site px: p-1 frame, 36px rows (min-h-9), separators my-1 around a hairline. */
const PAD = 4;
const ROW = 36;
const SEPARATOR = 9;
/** min-w-52: every entry here fits, so the panel keeps its minimum width. */
export const MENU_WIDTH = 208;
/** The panel opens this far below its trigger (dropdown-menu.tsx GAP). */
export const MENU_GAP = 4;

/**
 * Where the pointer clicks the entry labelled `label`, from the panel's top-left corner: right of
 * the label, so the arrow never covers the words.
 */
export function menuEntryPoint(entries: MenuEntry[], label: string): { x: number; y: number } {
  let y = PAD + 1;
  for (const entry of entries) {
    if (entry === "separator") {
      y += SEPARATOR;
      continue;
    }
    if (entry.label === label) return { x: MENU_WIDTH - 34, y: y + ROW / 2 - 3 };
    y += ROW;
  }
  throw new Error(`No menu entry "${label}"`);
}

/** The open menu: `raised` panel with a soft shadow, entries with icons, the hovered one filled. */
export function MenuPanel({
  entries,
  hover = null,
  open = 1,
  style,
}: {
  entries: MenuEntry[];
  /** Label of the entry under the pointer. */
  hover?: string | null;
  /** 0 → 1 the site's opening: fade and scale up from the trigger's corner. */
  open?: number;
  style?: CSSProperties;
}) {
  if (open <= 0.001) return null;
  return (
    <div
      role="menu"
      className="absolute z-50 rounded-lg border border-border bg-raised p-1 text-left shadow-[0_10px_28px_-8px_var(--shadow-color),0_2px_6px_var(--shadow-color)]"
      style={{
        width: MENU_WIDTH,
        opacity: open,
        transform: open < 1 ? `scale(${0.95 + 0.05 * open})` : undefined,
        transformOrigin: "top right",
        ...style,
      }}
    >
      {entries.map((entry, i) => {
        if (entry === "separator") return <div key={`sep-${i}`} role="separator" className="-mx-1 my-1 h-px bg-border" />;
        const Icon = entry.icon;
        return (
          <div
            key={entry.label}
            role="menuitem"
            className={cn(
              "flex min-h-9 w-full items-center gap-2.5 rounded-md px-2 text-left text-small text-foreground [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted",
              hover === entry.label && "bg-surface-hover",
            )}
          >
            <Icon aria-hidden strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** The ⋯ trigger in its open look, laid over the page's own trigger while its menu is open. */
export function OpenTrigger({ kind, style }: { kind: "thread" | "comment"; style?: CSSProperties }) {
  return (
    <span
      aria-hidden
      className={
        kind === "thread"
          ? buttonClasses({ variant: "ghost", size: "icon", className: "absolute bg-surface-hover text-foreground" })
          : "absolute inline-flex size-8 items-center justify-center rounded-md bg-surface-hover text-foreground [&_svg]:size-4"
      }
      style={style}
    >
      <MoreHorizontal strokeWidth={1.75} />
    </span>
  );
}
