"use client";

import { LoaderCircle, MessageSquare, Search, X } from "lucide-react";
import { useEffect, useId, useState, type KeyboardEvent } from "react";

import type { SearchResponse, SearchThread } from "@/components/command/types";
import { SEARCH_QUERY_MAX } from "@/components/command/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/field";

export type LinkedThread = { slug: string; title: string };

type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; results: SearchThread[] }
  | { status: "error" };

const DEBOUNCE_MS = 200;

/** Search-as-you-type combobox over the forum's own search, for linking a step to one thread. */
export function ThreadPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: LinkedThread | null;
  onChange: (thread: LinkedThread | null) => void;
}) {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);

  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearch({ status: "loading" });
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as SearchResponse;
        setSearch({ status: "done", results: body.results });
        setActive(0);
      } catch {
        if (!controller.signal.aborted) setSearch({ status: "error" });
      }
    }, DEBOUNCE_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  if (value) {
    return (
      <div className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background py-1 pl-3 pr-1">
        <MessageSquare aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-muted" />
        <span className="min-w-0 flex-1 truncate text-sm text-foreground">
          <span className="sr-only">{label}: </span>
          {value.title}
        </span>
        <Button variant="ghost" size="icon" aria-label={`Remove linked thread ${value.title}`} onClick={() => onChange(null)}>
          <X strokeWidth={1.75} />
        </Button>
      </div>
    );
  }

  const results = trimmed && search.status === "done" ? search.results : [];
  const expanded = open && trimmed.length > 0;
  const listId = `${uid}-list`;
  const optionId = (index: number) => `${uid}-option-${index}`;

  function choose(thread: SearchThread) {
    onChange({ slug: thread.slug, title: thread.title });
    setQuery("");
    setSearch({ status: "idle" });
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape" && expanded) {
      event.preventDefault();
      setOpen(false);
      return;
    }
    // Enter picks a thread; it never submits the surrounding guide form.
    if (event.key === "Enter") {
      event.preventDefault();
      const thread = expanded ? results[active] : undefined;
      if (thread) choose(thread);
      return;
    }
    if (results.length === 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
    }
  }

  const status = !trimmed
    ? ""
    : search.status === "loading"
      ? "Searching…"
      : search.status === "error"
        ? "Search failed. Try again."
        : search.status === "done" && results.length === 0
          ? "No matching threads."
          : search.status === "done"
            ? `${results.length} ${results.length === 1 ? "thread" : "threads"} found.`
            : "";

  return (
    <div className="relative">
      <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
      <Input
        type="search"
        role="combobox"
        aria-label={label}
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && results[active] ? optionId(active) : undefined}
        placeholder="Search threads to link…"
        autoComplete="off"
        maxLength={SEARCH_QUERY_MAX}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="pl-9"
      />
      {search.status === "loading" && trimmed && (
        <LoaderCircle
          aria-hidden
          strokeWidth={1.75}
          className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-subtle motion-safe:animate-spin"
        />
      )}
      <p role="status" className="sr-only">
        {status}
      </p>
      <ul
        id={listId}
        role="listbox"
        aria-label="Matching threads"
        hidden={!expanded || results.length === 0}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-[0_10px_28px_-8px_var(--shadow-color),0_2px_6px_var(--shadow-color)]"
      >
        {results.map((thread, index) => (
          <li
            key={thread.slug}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            // Pointer-down keeps focus in the field so the blur handler doesn't close the list first.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(thread)}
            onMouseMove={() => setActive(index)}
            className={cn(
              "flex min-h-9 cursor-pointer flex-col justify-center rounded-md px-2 py-1.5 pointer-coarse:min-h-11",
              index === active ? "bg-surface-hover" : undefined,
            )}
          >
            <span className="truncate text-sm text-foreground">{thread.title}</span>
            {thread.category && <span className="truncate text-meta text-muted">{thread.category.name}</span>}
          </li>
        ))}
      </ul>
      {expanded && trimmed && search.status !== "loading" && status && results.length === 0 && (
        <p aria-hidden className="mt-1.5 text-meta text-muted">
          {status}
        </p>
      )}
    </div>
  );
}
