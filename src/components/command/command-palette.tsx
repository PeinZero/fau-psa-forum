"use client";

import {
  ArrowRight,
  Info,
  Megaphone,
  Loader2,
  MessageSquare,
  MessageSquareText,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";

import { CategoryIcon } from "@/components/thread/category-icon";
import { cn } from "@/components/ui/cn";
import { Kbd } from "@/components/ui/kbd";
import { cityLabels } from "@/lib/labels";
import { Highlight } from "./highlight";
import { useIsApple } from "./platform";
import { SEARCH_QUERY_MAX, type SearchCategory, type SearchThread } from "./types";
import { useThreadSearch } from "./use-thread-search";

type Item = {
  key: string;
  href: string;
  label: string;
  icon: ReactNode;
  thread?: SearchThread;
};

type Group = { heading: string; items: Item[] };

const iconClass = "size-4 shrink-0 text-muted";

const actions: (Item & { moderatorOnly?: boolean })[] = [
  { key: "action:new", href: "/new", label: "New thread", icon: <Plus className={iconClass} strokeWidth={1.75} /> },
  {
    key: "action:announcements",
    href: "/announcements",
    label: "Announcements",
    icon: <Megaphone className={iconClass} strokeWidth={1.75} />,
  },
  { key: "action:about", href: "/about", label: "About", icon: <Info className={iconClass} strokeWidth={1.75} /> },
  {
    key: "action:contributors",
    href: "/contributors",
    label: "Contributors",
    icon: <Users className={iconClass} strokeWidth={1.75} />,
  },
  {
    key: "action:mod",
    href: "/mod",
    label: "Moderation",
    icon: <ShieldCheck className={iconClass} strokeWidth={1.75} />,
    moderatorOnly: true,
  },
];

function searchHref(query: string): string {
  return `/search?q=${encodeURIComponent(query.trim())}`;
}

function categorySearchItem(category: SearchCategory, query: string): Item {
  return {
    key: `search-in:${category.slug}`,
    href: `/search?q=${encodeURIComponent(query.trim())}&category=${encodeURIComponent(category.slug)}`,
    label: `Search in ${category.name}`,
    icon: <Search className={iconClass} strokeWidth={1.75} />,
  };
}

function threadItem(thread: SearchThread): Item {
  return {
    key: `thread:${thread.slug}`,
    href: `/t/${thread.slug}`,
    label: thread.title,
    icon: <MessageSquareText className={iconClass} strokeWidth={1.75} />,
    thread,
  };
}

function categoryItem(category: SearchCategory): Item {
  return {
    key: `category:${category.slug}`,
    href: `/c/${category.slug}`,
    label: category.name,
    icon: <CategoryIcon slug={category.slug} className="size-4! rounded-none! border-0! bg-transparent! [&_svg]:size-4" />,
  };
}

function buildGroups(
  query: string,
  results: SearchThread[] | null,
  recent: SearchThread[],
  categories: SearchCategory[],
  canModerate: boolean,
): Group[] {
  const visibleActions = actions.filter((action) => canModerate || !action.moderatorOnly);
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return [
      { heading: "Recent threads", items: recent.map(threadItem) },
      { heading: "Quick actions", items: visibleActions },
      { heading: "Browse categories", items: categories.map(categoryItem) },
      { heading: "Search in a category", items: categories.map((category) => categorySearchItem(category, "")) },
    ].filter((group) => group.items.length > 0);
  }

  const matches = (label: string) => label.toLowerCase().includes(needle);
  return [
    { heading: "Threads", items: (results ?? []).map(threadItem) },
    {
      heading: "Jump to",
      items: [...categories.filter((category) => matches(category.name)).map(categoryItem), ...visibleActions.filter((action) => matches(action.label))],
    },
    {
      heading: "Search",
      items: [
        {
          key: "search:all",
          href: searchHref(query),
          label: `Search all results for “${query.trim()}”`,
          icon: <Search className={iconClass} strokeWidth={1.75} />,
        },
        ...categories.filter((category) => matches(category.name)).map((category) => categorySearchItem(category, query)),
      ],
    },
  ].filter((group) => group.items.length > 0);
}

function ThreadMeta({ thread }: { thread: SearchThread }) {
  const parts = [thread.category?.name, thread.city ? cityLabels[thread.city] : null].filter(Boolean);
  if (parts.length === 0) return null;
  return <span className="block truncate text-meta text-muted">{parts.join(" · ")}</span>;
}

/** Dispatch (cancelable) on `window` to open the palette from anywhere; a handled event is canceled. */
export const OPEN_COMMAND_PALETTE = "open-command-palette";

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  canModerate: boolean;
  /** Receives focus on close when the palette was not opened from a focused element. */
  triggerRef: RefObject<HTMLElement | null>;
};

export function CommandPalette({ open, onClose, canModerate, triggerRef }: CommandPaletteProps) {
  const router = useRouter();
  const apple = useIsApple();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const backdropPress = useRef(false);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const [requested, setRequested] = useState(false);
  // The owner's own toggle (⌘K) takes over from an event request.
  const [ownerOpen, setOwnerOpen] = useState(open);
  if (open !== ownerOpen) {
    setOwnerOpen(open);
    setRequested(false);
  }
  const isOpen = open || requested;
  const [query, setQuery] = useState("");
  // -1 keeps the focus in the query: Enter then searches everything rather than opening the top
  // hit, which a fast typist would otherwise open by accident before the results settle.
  const [active, setActive] = useState(-1);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setActive(-1);
    }
  }

  const { results, suggestions, loading, failed } = useThreadSearch(query, isOpen);
  const trimmed = query.trim();
  const groups = buildGroups(query, results, suggestions?.recent ?? [], suggestions?.categories ?? [], canModerate);
  const items = groups.flatMap((group) => group.items);
  const activeIndex = active < items.length ? active : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;
  const optionId = (index: number) => `${id}-option-${index}`;
  const noThreads = trimmed !== "" && !loading && !failed && results?.length === 0;

  useEffect(() => {
    const onRequest = (event: Event) => {
      event.preventDefault();
      setRequested(true);
    };
    window.addEventListener(OPEN_COMMAND_PALETTE, onRequest);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE, onRequest);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      returnFocus.current = document.activeElement;
      dialog.showModal();
      inputRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    document.getElementById(`${id}-option-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [id, activeIndex]);

  function handleClose() {
    const previous = returnFocus.current;
    const target = previous instanceof HTMLElement && previous.isConnected && previous !== document.body ? previous : triggerRef.current;
    target?.focus();
    setRequested(false);
    onClose();
  }

  function go(href: string) {
    router.push(href);
    dialogRef.current?.close();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      // The query itself is the slot before the first item, so ↑ from the top deselects.
      const slots = items.length + 1;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive(((activeIndex + 1 + step + slots) % slots) - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if ((event.metaKey || event.ctrlKey) && trimmed) go(searchHref(query));
      else if (activeItem) go(activeItem.href);
      else if (trimmed) go(searchHref(query));
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Search"
      onClose={handleClose}
      onPointerDown={(event) => {
        backdropPress.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropPress.current && event.target === event.currentTarget) event.currentTarget.close();
      }}
      className={cn(
        "m-0 mx-auto mt-[12vh] flex w-[calc(100vw-2rem)] max-w-[640px] flex-col overflow-hidden p-0 not-open:hidden",
        "max-h-[min(560px,76vh)] rounded-xl border border-border bg-background text-foreground dark:bg-surface",
        "shadow-[0_24px_64px_-12px_rgb(0_0_0/0.35),0_0_0_1px_var(--border)]",
        "max-md:mt-0 max-md:max-h-[85dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-none max-md:border-x-0 max-md:border-t-0",
        "transition-[opacity,scale,translate] duration-150 ease-entrance",
        "starting:open:scale-[0.98] starting:open:opacity-0 max-md:starting:open:-translate-y-2 max-md:starting:open:scale-100",
        "backdrop:bg-black/30 backdrop:backdrop-blur-[3px] dark:backdrop:bg-black/60",
        "backdrop:transition-opacity backdrop:duration-150 starting:open:backdrop:opacity-0",
      )}
    >
      <div className="flex items-center gap-2.5 border-b border-border px-4">
        {loading && trimmed ? (
          <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-muted" strokeWidth={1.75} />
        ) : (
          <Search aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
        )}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={activeItem ? optionId(activeIndex) : undefined}
          aria-autocomplete="list"
          aria-label="Search threads"
          placeholder="Search threads…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={SEARCH_QUERY_MAX}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-subtle md:text-[15px]"
        />
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="-mr-2 inline-flex min-h-11 items-center rounded-md px-2 text-meta font-medium text-muted hover:text-foreground md:hidden"
        >
          Cancel
        </button>
        <Kbd aria-hidden className="max-md:hidden">
          esc
        </Kbd>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {failed ? (
          <p className="px-3 py-6 text-center text-meta text-muted">Search is unavailable right now. Please try again.</p>
        ) : null}
        {noThreads ? (
          <p className="px-3 pb-1 pt-4 text-meta text-muted">
            No threads found —{" "}
            <Link
              href={searchHref(query)}
              onClick={() => dialogRef.current?.close()}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              search all results
            </Link>
          </p>
        ) : null}
        {loading && items.length === 0 ? (
          <p className="flex items-center justify-center gap-2 px-3 py-6 text-meta text-muted">
            <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.75} />
            Loading…
          </p>
        ) : null}

        <div role="listbox" id={listboxId} aria-label="Search results">
          {groups.map((group) => {
            const headingId = `${id}-${group.heading.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={group.heading} role="group" aria-labelledby={headingId} className="pb-1">
                <div id={headingId} className="px-3 pb-1 pt-2.5 text-xs font-medium text-subtle">
                  {group.heading}
                </div>
                {group.items.map((item) => {
                  const index = items.indexOf(item);
                  const selected = index === activeIndex;
                  const enterTarget = !activeItem && trimmed !== "" && item.key === "search:all";
                  return (
                    <div
                      key={item.key}
                      id={optionId(index)}
                      role="option"
                      aria-selected={selected}
                      onMouseMove={() => {
                        if (!selected) setActive(index);
                      }}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => go(item.href)}
                      className={cn(
                        "flex min-h-10 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm pointer-coarse:min-h-11",
                        selected ? "bg-surface-hover text-foreground" : "text-foreground/90",
                      )}
                    >
                      {item.icon}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">
                          {item.thread ? <Highlight text={item.label} query={query} /> : item.label}
                        </span>
                        {item.thread ? <ThreadMeta thread={item.thread} /> : null}
                      </span>
                      {item.thread && item.thread.commentCount > 0 ? (
                        <span className="flex shrink-0 items-center gap-1 text-xs tabular-nums text-subtle">
                          <MessageSquare aria-hidden className="size-3.5" strokeWidth={1.75} />
                          {item.thread.commentCount}
                          <span className="sr-only">comments</span>
                        </span>
                      ) : null}
                      {enterTarget ? (
                        <Kbd aria-hidden className="max-md:hidden">
                          ↵
                        </Kbd>
                      ) : (
                        <ArrowRight
                          aria-hidden
                          className={cn("size-4 shrink-0 text-subtle", selected ? "opacity-100" : "opacity-0")}
                          strokeWidth={1.75}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div
        aria-hidden
        className="flex items-center gap-4 border-t border-border px-4 py-2 text-xs text-subtle max-md:hidden"
      >
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd>
          navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          {activeItem || !trimmed ? "open" : "all results"}
        </span>
        {apple !== null && activeItem ? (
          <span className="flex items-center gap-1.5">
            <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd>
            <Kbd>↵</Kbd>
            all results
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1.5">
          <Kbd>esc</Kbd>
          close
        </span>
      </div>

      <p aria-live="polite" className="sr-only">
        {trimmed && !loading && results ? `${results.length} ${results.length === 1 ? "thread" : "threads"} found` : ""}
      </p>
    </dialog>
  );
}
