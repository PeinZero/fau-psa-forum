"use client";

import { useCallback, useEffect, useId, useRef, useState, type ComponentProps, type Ref } from "react";

import { Avatar } from "@/components/author";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { Textarea } from "@/components/ui/field";
import { affiliationLabels } from "@/lib/labels";
import { findMentionToken, type MentionToken, type MentionUser } from "./types";

type Props = Omit<ComponentProps<"textarea">, "value" | "onChange" | "ref"> & {
  value: string;
  onValueChange: (value: string) => void;
  ref?: Ref<HTMLTextAreaElement>;
};

function badgeFor(user: MentionUser): { label: string; accent: boolean } | null {
  if (user.role !== "member") return { label: "Moderator", accent: true };
  return user.affiliation ? { label: affiliationLabels[user.affiliation], accent: false } : null;
}

/** Textarea that suggests people while typing `@name`; behaves like a plain Textarea otherwise. */
export function MentionTextarea({ value, onValueChange, onKeyDown, onBlur, ref, className, ...props }: Props) {
  const id = useId();
  const listId = `${id}-mentions`;
  const inner = useRef<HTMLTextAreaElement | null>(null);
  const [token, setToken] = useState<MentionToken | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [fetched, setFetched] = useState<{ query: string; users: MentionUser[] }>({ query: "", users: [] });
  const [active, setActive] = useState(0);

  const setRefs = useCallback(
    (node: HTMLTextAreaElement | null) => {
      inner.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const query = token?.query ?? "";
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/users?q=${encodeURIComponent(query.toLowerCase())}`, {
          signal: controller.signal,
        });
        const users = response.ok ? ((await response.json()) as MentionUser[]) : [];
        setFetched({ query, users });
        setActive(0);
      } catch {
        // Aborted or offline: keep typing, the picker simply stays closed.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const key = token ? `${token.start}:${token.query}` : null;
  const users = fetched.query === query ? fetched.users : [];
  const open = token !== null && key !== dismissed && users.length > 0;
  const optionId = (index: number) => `${id}-option-${index}`;

  function sync(element: HTMLTextAreaElement) {
    setToken(element.selectionStart === element.selectionEnd ? findMentionToken(element.value, element.selectionStart) : null);
  }

  function pick(user: MentionUser) {
    if (!token) return;
    const insert = `@${user.username} `;
    const caret = token.start + insert.length;
    onValueChange(value.slice(0, token.start) + insert + value.slice(token.end));
    setToken(null);
    requestAnimationFrame(() => {
      inner.current?.focus();
      inner.current?.setSelectionRange(caret, caret);
    });
  }

  return (
    <div className="relative">
      <Textarea
        {...props}
        ref={setRefs}
        value={value}
        className={className}
        role="combobox"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open ? optionId(active) : undefined}
        onChange={(e) => {
          onValueChange(e.target.value);
          sync(e.target);
        }}
        onSelect={(e) => sync(e.currentTarget)}
        onBlur={(e) => {
          setToken(null);
          onBlur?.(e);
        }}
        onKeyDown={(e) => {
          if (open && !e.metaKey && !e.ctrlKey && !e.altKey) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + users.length) % users.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              pick(users[active]);
              return;
            }
            if (e.key === "Escape") {
              // Closing the picker must not also cancel an enclosing editor.
              e.preventDefault();
              e.stopPropagation();
              setDismissed(key);
              return;
            }
          }
          onKeyDown?.(e);
        }}
      />
      <span role="status" className="sr-only">
        {open ? `${users.length} ${users.length === 1 ? "person" : "people"} found` : ""}
      </span>
      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Mention suggestions"
          className="absolute inset-x-0 top-full z-20 mt-1 flex animate-[fade-in_120ms_ease-out_both] flex-col overflow-hidden rounded-md border border-border bg-surface p-1 shadow-[0_8px_24px_var(--shadow-color)] motion-reduce:animate-none"
        >
          {users.map((user, index) => {
            const badge = badgeFor(user);
            return (
              <li
                key={user.username}
                id={optionId(index)}
                role="option"
                aria-selected={index === active}
                // Keeps focus in the textarea so the caret and selection survive the click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(user)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  "flex min-h-9 cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 pointer-coarse:min-h-11",
                  index === active && "bg-surface-hover",
                )}
              >
                <Avatar name={user.display_name} />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {user.display_name} <span className="text-muted">@{user.username}</span>
                </span>
                {badge ? <Badge variant={badge.accent ? "accent" : "neutral"}>{badge.label}</Badge> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
