"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { cn } from "@/components/ui/cn";
import { fieldClasses, Select } from "@/components/ui/field";

import { BROWSE_QUERY_MAX, browseHref, type BrowseState } from "./params";

/**
 * Search within the current list, plus the category filter on /browse. Without JavaScript it is a
 * plain GET form; with it, empty fields are left out of the URL and a category choice applies at once.
 */
export function FilterForm({
  path,
  state,
  categories,
  placeholder,
}: {
  path: string;
  state: Omit<BrowseState, "page">;
  categories?: { slug: string; name: string }[];
  placeholder: string;
}) {
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const q = String(data.get("q") ?? "").trim();
    const category = categories ? String(data.get("category") ?? "") || undefined : state.category;
    router.push(browseHref(path, { ...state, q, category }));
  }

  return (
    <form action={path} onSubmit={submit} role="search" className="flex flex-col gap-2 sm:flex-row">
      {state.sort !== "hot" && <input type="hidden" name="sort" value={state.sort} />}
      {state.sort === "top" && <input type="hidden" name="period" value={state.period} />}
      {state.city && <input type="hidden" name="city" value={state.city} />}
      <div className="relative min-w-0 flex-1">
        <label htmlFor="browse-q" className="sr-only">
          {placeholder}
        </label>
        <Search
          aria-hidden
          strokeWidth={1.75}
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
        />
        <input
          id="browse-q"
          key={state.q}
          type="search"
          name="q"
          defaultValue={state.q}
          maxLength={BROWSE_QUERY_MAX}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className={cn(fieldClasses, "min-h-9 py-1.5 pl-9 pointer-coarse:min-h-11")}
        />
      </div>
      {categories && (
        <>
          <label htmlFor="browse-category" className="sr-only">
            Category
          </label>
          <Select
            id="browse-category"
            name="category"
            key={state.category ?? ""}
            defaultValue={state.category ?? ""}
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="sm:w-52"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </>
      )}
    </form>
  );
}
