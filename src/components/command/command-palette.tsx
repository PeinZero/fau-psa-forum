"use client";

import { Loader2, MessageSquare, RotateCw, Search, SearchX, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import { cityLabels } from "@/lib/labels";
import { buildGroups, type Item, searchHref } from "./groups";
import { Highlight } from "./highlight";
import { useIsApple } from "./platform";
import { SEARCH_QUERY_MAX, type SearchThread } from "./types";
import { useThreadSearch } from "./use-thread-search";

function threadMeta(thread: SearchThread): string | undefined {
  const parts = [thread.category?.name, thread.city ? cityLabels[thread.city] : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function GroupHeading({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div id={id} className="px-3 pb-1 pt-3 text-meta font-medium text-muted first:pt-1">
      {children}
    </div>
  );
}

const tileClass =
  "flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-muted [&_svg]:size-4";

/** Mirrors a thread row (tile, title, meta line) so results replace it without a jump. */
function SkeletonRows({ heading, count }: { heading: string; count: number }) {
  const widths = ["w-4/5", "w-3/5", "w-2/3", "w-1/2", "w-3/4"];
  return (
    <div aria-hidden className="pb-1">
      <GroupHeading>{heading}</GroupHeading>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-3 py-2">
          <Skeleton className="size-8" />
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-6 items-center">
              <Skeleton className={cn("h-3.5", widths[index % widths.length])} />
            </div>
            <div className="flex h-5 items-center">
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function StateBlock({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 pb-4 pt-8 text-center">
      <div aria-hidden className={cn(tileClass, "mb-3 size-10 rounded-lg [&_svg]:size-5")}>
        {icon}
      </div>
      <p className="text-body font-medium text-foreground">{title}</p>
      <div className="mt-1 max-w-sm text-meta text-muted">{children}</div>
    </div>
  );
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

  const { results, suggestions, loading, failed, retry } = useThreadSearch(query, isOpen);
  const trimmed = query.trim();
  const noThreads = trimmed !== "" && !loading && !failed && results?.length === 0;
  const groups = buildGroups({
    query,
    threads: failed ? [] : (results ?? []),
    recent: suggestions?.recent ?? [],
    categories: suggestions?.categories ?? [],
    canModerate,
    noThreads,
  });
  const items = groups.flatMap((group) => group.items);
  const activeIndex = active < items.length ? active : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : undefined;
  const optionId = (index: number) => `${id}-option-${index}`;
  const skeleton =
    failed || !loading
      ? null
      : trimmed
        ? results === null && { heading: "Threads", count: 3 }
        : suggestions === null && { heading: "Recent threads", count: 5 };

  let announcement = "";
  if (failed) announcement = "Search didn’t load.";
  else if (trimmed && !loading && results) {
    announcement = results.length === 0 ? "No threads found" : `${results.length} ${results.length === 1 ? "thread" : "threads"} found`;
  }

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
        // A fixed height keeps the frame still while results, skeletons and empty states swap inside it.
        "m-0 mx-auto mt-[12vh] flex h-[min(30rem,76vh)] w-[calc(100vw-2rem)] max-w-[640px] flex-col overflow-hidden p-0 not-open:hidden",
        "rounded-xl border border-border bg-background text-foreground shadow-[0_24px_48px_-12px_var(--shadow-color)]",
        "max-md:mt-0 max-md:h-[85dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-none max-md:border-x-0 max-md:border-t-0",
        "transition-[opacity,scale,translate] duration-150 ease-entrance",
        "starting:open:scale-[0.98] starting:open:opacity-0 max-md:starting:open:-translate-y-2 max-md:starting:open:scale-100",
        "backdrop:bg-black/40 backdrop:backdrop-blur-[2px]",
        "backdrop:transition-opacity backdrop:duration-150 starting:open:backdrop:opacity-0",
      )}
    >
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        {loading && trimmed ? (
          <Loader2 aria-hidden className="size-4 shrink-0 animate-spin text-subtle" strokeWidth={1.75} />
        ) : (
          <Search aria-hidden className="size-4 shrink-0 text-subtle" strokeWidth={1.75} />
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
          className="h-full min-w-0 flex-1 bg-transparent text-body text-foreground outline-none placeholder:text-subtle"
        />
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="-mr-2 hidden min-h-11 items-center rounded-md px-2 text-meta font-medium text-muted transition-colors duration-150 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:inline-flex"
        >
          Cancel
        </button>
        <Kbd aria-hidden className="pointer-coarse:hidden">
          Esc
        </Kbd>
      </div>

      <div className="min-h-0 flex-1 scroll-py-2 overflow-y-auto overscroll-contain p-2">
        {failed ? (
          <StateBlock icon={<WifiOff />} title="Search didn’t load">
            <p>Check your connection and try again.</p>
            <Button variant="secondary" size="sm" onClick={retry} className="mt-3">
              <RotateCw strokeWidth={1.75} />
              Try again
            </Button>
          </StateBlock>
        ) : null}
        {noThreads ? (
          <StateBlock icon={<SearchX />} title={`No threads match “${trimmed}”`}>
            Try fewer words or the German term, like “Anmeldung”.
          </StateBlock>
        ) : null}
        {skeleton ? <SkeletonRows {...skeleton} /> : null}

        <div role="listbox" id={listboxId} aria-label="Search results" aria-busy={loading}>
          {groups.map((group) => {
            const headingId = `${id}-${group.heading.replace(/\s+/g, "-").toLowerCase()}`;
            return (
              <div key={group.heading} role="group" aria-labelledby={headingId} className="pb-1">
                <GroupHeading id={headingId}>{group.heading}</GroupHeading>
                {group.items.map((item) => {
                  const index = items.indexOf(item);
                  return (
                    <Option
                      key={item.key}
                      id={optionId(index)}
                      item={item}
                      query={query}
                      selected={index === activeIndex}
                      enterHint={index === activeIndex || (!activeItem && trimmed !== "" && item.key === "search:all")}
                      onHover={() => setActive(index)}
                      onPick={() => go(item.href)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div
        aria-hidden
        className="hidden h-10 shrink-0 items-center gap-4 border-t border-border px-4 text-meta text-muted pointer-fine:flex"
      >
        <span className="flex items-center gap-1.5">
          <span className="flex gap-0.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </span>
          Navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          {activeItem || !trimmed ? "Open" : "All results"}
        </span>
        {apple !== null && activeItem && trimmed ? (
          <span className="flex items-center gap-1.5 max-sm:hidden">
            <span className="flex gap-0.5">
              <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd>
              <Kbd>↵</Kbd>
            </span>
            All results
          </span>
        ) : null}
        <span className="ml-auto flex items-center gap-1.5">
          <Kbd>Esc</Kbd>
          Close
        </span>
      </div>

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </dialog>
  );
}

type OptionProps = {
  id: string;
  item: Item;
  query: string;
  selected: boolean;
  /** Shows ↵ where Enter would go; the hint keeps its width when hidden so titles never re-truncate. */
  enterHint: boolean;
  onHover: () => void;
  onPick: () => void;
};

function Option({ id, item, query, selected, enterHint, onHover, onPick }: OptionProps) {
  const meta = item.thread ? threadMeta(item.thread) : item.meta;
  const comments = item.thread?.commentCount ?? 0;
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onMouseMove={() => {
        if (!selected) onHover();
      }}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onPick}
      className={cn(
        "relative flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2",
        "before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:rounded-full before:bg-accent before:opacity-0",
        selected && "bg-surface-hover before:opacity-100",
      )}
    >
      <span aria-hidden className={cn(tileClass, selected && "text-foreground")}>
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          title={item.label}
          className="block truncate text-body text-foreground max-sm:line-clamp-2 max-sm:whitespace-normal"
        >
          {item.thread ? <Highlight text={item.label} query={query} /> : item.label}
        </span>
        {meta ? <span className="block truncate text-meta text-muted">{meta}</span> : null}
      </span>
      {comments > 0 ? (
        <span className="flex shrink-0 items-center gap-1 text-meta tabular-nums text-subtle">
          <MessageSquare aria-hidden className="size-3.5" strokeWidth={1.75} />
          {comments}
          <span className="sr-only"> {comments === 1 ? "comment" : "comments"}</span>
        </span>
      ) : null}
      <Kbd aria-hidden className={cn("pointer-coarse:hidden", !enterHint && "invisible")}>
        ↵
      </Kbd>
    </div>
  );
}
