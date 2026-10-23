"use client";

import { LoaderCircle, type LucideIcon, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { Button, buttonClasses } from "./button";
import { cn } from "./cn";
import { Label, Textarea } from "./field";

/** A second step inside the menu before `onSelect` runs, optionally asking for a reason. */
export type MenuConfirm = {
  message: string;
  action: string;
  reason?: { label: string; max: number };
};

export type MenuItem = {
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  /** Renders a link instead of a button. */
  href?: string;
  /** Renders an on/off switch (menuitemcheckbox). */
  checked?: boolean;
  confirm?: MenuConfirm;
  onSelect?: (input: { reason?: string }) => void;
};

/** Falsy entries are skipped, so callers can write `isMod && {...}`. */
export type MenuEntry = MenuItem | "separator" | false | null | undefined;

const EDGE = 8;
const GAP = 4;
const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemcheckbox"]';

function compact(entries: readonly MenuEntry[]): (MenuItem | "separator")[] {
  const out: (MenuItem | "separator")[] = [];
  for (const entry of entries) {
    if (!entry) continue;
    if (entry === "separator" && (out.length === 0 || out[out.length - 1] === "separator")) continue;
    out.push(entry);
  }
  if (out[out.length - 1] === "separator") out.pop();
  return out;
}

function itemClasses(danger: boolean | undefined): string {
  return cn(
    "flex min-h-8 w-full select-none items-center gap-2.5 rounded-md px-2 text-left text-sm outline-none transition-colors duration-100 pointer-coarse:min-h-11",
    "[&>svg]:size-4 [&>svg]:shrink-0",
    danger ? "text-danger focus:bg-danger/10" : "text-foreground focus:bg-surface-hover [&>svg]:text-muted",
  );
}

type Props = {
  /** Accessible name of the trigger and the menu. */
  label: string;
  items: readonly MenuEntry[];
  /** Replaces the ⋯ icon. */
  trigger?: ReactNode;
  triggerClassName?: string;
  /** Non-interactive line above the items, e.g. who is signed in. */
  heading?: ReactNode;
  /** Shows a spinner on the trigger while an item's action runs. */
  busy?: boolean;
  className?: string;
};

/**
 * Overflow menu: arrow keys, Home/End, Escape and outside click; opens right-aligned and stays
 * inside the viewport. Renders nothing when no item is left.
 */
export function DropdownMenu({ label, items, trigger, triggerClassName, heading, busy = false, className }: Props) {
  const entries = compact(items);
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<MenuItem | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Which item gets focus when the list (re)appears: an index, the last item, or the menu itself.
  const initialFocus = useRef<number | "last" | "menu">("menu");
  const uid = useId();
  const menuId = `${uid}-menu`;

  function menuItems(): HTMLElement[] {
    return Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
  }

  function openMenu(focus: number | "last" | "menu") {
    initialFocus.current = focus;
    setConfirming(null);
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    setConfirming(null);
    if (returnFocus) triggerRef.current?.focus();
  }

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const anchor = triggerRef.current;
    if (!open || !menu || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const up =
      rect.bottom + GAP + menu.offsetHeight > window.innerHeight - EDGE && rect.top - GAP - menu.offsetHeight >= EDGE;
    const left = rect.right - menu.offsetWidth;
    menu.style.top = up ? "auto" : `calc(100% + ${GAP}px)`;
    menu.style.bottom = up ? `calc(100% + ${GAP}px)` : "auto";
    menu.style.translate = left < EDGE ? `${EDGE - left}px 0` : "";
    menu.style.transformOrigin = up ? "bottom right" : "top right";
  }, [open, confirming]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!open || !menu) return;
    if (confirming) {
      menu.querySelector<HTMLElement>("textarea, button")?.focus();
      return;
    }
    const list = Array.from(menu.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
    const target = initialFocus.current;
    if (target === "menu") menu.focus();
    else list[target === "last" ? list.length - 1 : Math.min(target, list.length - 1)]?.focus();
  }, [open, confirming]);

  useEffect(() => {
    if (!open) return;
    function onOutside(event: Event) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setConfirming(null);
      }
    }
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("focusin", onOutside);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("focusin", onOutside);
    };
  }, [open]);

  if (entries.length === 0) return null;

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowDown" ? 0 : "last");
    }
  }

  function onTriggerClick(event: MouseEvent<HTMLButtonElement>) {
    if (open) close(false);
    // Keyboard activation (detail 0) lands on the first item; a pointer click highlights nothing yet.
    else openMenu(event.detail === 0 ? 0 : "menu");
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (confirming) return;
    if (event.key === "Tab") {
      close(false);
      return;
    }
    const list = menuItems();
    if (list.length === 0) return;
    const current = list.indexOf(document.activeElement as HTMLElement);
    const next = {
      ArrowDown: current + 1,
      ArrowUp: current === -1 ? list.length - 1 : current - 1,
      Home: 0,
      End: list.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    list[(next + list.length) % list.length]?.focus();
  }

  function select(item: MenuItem, index: number) {
    if (item.confirm) {
      initialFocus.current = index;
      setConfirming(item);
      return;
    }
    close(true);
    item.onSelect?.({});
  }

  function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirming) return;
    const reason = new FormData(event.currentTarget).get("reason");
    const item = confirming;
    close(true);
    item.onSelect?.({ reason: typeof reason === "string" ? reason.trim() : undefined });
  }

  let itemIndex = -1;

  return (
    <div ref={rootRef} className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={busy || undefined}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
        className={triggerClassName ?? buttonClasses({ variant: "ghost", size: "icon", className: open ? "bg-surface-hover text-foreground" : undefined })}
      >
        {busy ? (
          <LoaderCircle aria-hidden strokeWidth={1.75} className="motion-safe:animate-spin" />
        ) : (
          (trigger ?? <MoreHorizontal aria-hidden strokeWidth={1.75} />)
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role={confirming ? "dialog" : "menu"}
          aria-label={confirming ? confirming.label : label}
          tabIndex={-1}
          onKeyDown={onMenuKeyDown}
          onPointerLeave={() => {
            if (!confirming) menuRef.current?.focus();
          }}
          className={cn(
            "absolute right-0 z-50 max-w-[calc(100vw-1rem)] rounded-lg border border-border bg-surface p-1 text-left outline-none",
            "shadow-[0_10px_28px_-8px_var(--shadow-color),0_2px_6px_var(--shadow-color)]",
            "transition-[opacity,scale] duration-[120ms] ease-out starting:scale-95 starting:opacity-0",
            confirming ? "w-72" : "w-max min-w-52",
          )}
        >
          {confirming?.confirm ? (
            <form onSubmit={onConfirm} className="flex flex-col gap-3 p-2">
              <p className="text-meta text-muted">{confirming.confirm.message}</p>
              {confirming.confirm.reason && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`${uid}-reason`}>{confirming.confirm.reason.label}</Label>
                  <Textarea
                    id={`${uid}-reason`}
                    name="reason"
                    required
                    maxLength={confirming.confirm.reason.max}
                    rows={3}
                    className="min-h-20"
                  />
                </div>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant={confirming.danger ? "danger" : "primary"} size="sm">
                  {confirming.confirm.action}
                </Button>
              </div>
            </form>
          ) : (
            <>
              {heading && (
                <div role="none" className="truncate px-2 pb-1.5 pt-1 text-meta text-muted">
                  {heading}
                </div>
              )}
              {entries.map((entry, i) => {
                if (entry === "separator") {
                  return <div key={`sep-${i}`} role="separator" className="-mx-1 my-1 h-px bg-border" />;
                }
                const index = ++itemIndex;
                const Icon = entry.icon;
                const content = (
                  <>
                    {Icon && <Icon aria-hidden strokeWidth={1.75} />}
                    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                    {entry.checked !== undefined && <Switch on={entry.checked} />}
                  </>
                );
                const common = {
                  tabIndex: -1,
                  className: itemClasses(entry.danger),
                  onPointerMove: (event: MouseEvent<HTMLElement>) => {
                    if (document.activeElement !== event.currentTarget) event.currentTarget.focus();
                  },
                };
                if (entry.href) {
                  return (
                    <Link key={entry.label} href={entry.href} role="menuitem" onClick={() => close(false)} {...common}>
                      {content}
                    </Link>
                  );
                }
                return (
                  <button
                    key={entry.label}
                    type="button"
                    role={entry.checked === undefined ? "menuitem" : "menuitemcheckbox"}
                    aria-checked={entry.checked}
                    aria-haspopup={entry.confirm ? "dialog" : undefined}
                    onClick={() => select(entry, index)}
                    {...common}
                  >
                    {content}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Switch({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "ml-3 inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 transition-colors duration-150",
        on ? "bg-accent" : "bg-border-strong/50",
      )}
    >
      <span
        className={cn(
          "size-3 rounded-full bg-background shadow-[0_1px_2px_var(--shadow-color)] transition-transform duration-150",
          on && "translate-x-3",
        )}
      />
    </span>
  );
}
