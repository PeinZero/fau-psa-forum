"use client";

import { BadgeCheck, MessageSquareCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";

import { cn } from "@/components/ui/cn";
import { Label, Select } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";

export type SearchSort = "relevance" | "newest" | "top";
export type SearchCity = "all" | "erlangen" | "nuremberg";

export type SearchFilterState = {
  q: string;
  category: string;
  city: SearchCity;
  bestAnswer: boolean;
  verified: boolean;
  sort: SearchSort;
};

export function searchHref(state: SearchFilterState): string {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.category) params.set("category", state.category);
  if (state.city !== "all") params.set("city", state.city);
  if (state.bestAnswer) params.set("best", "1");
  if (state.verified) params.set("verified", "1");
  if (state.sort !== "relevance") params.set("sort", state.sort);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}

const cityOptions = [
  { value: "all", label: "Any city" },
  { value: "erlangen", label: "Erlangen" },
  { value: "nuremberg", label: "Nuremberg" },
] as const;

const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "top", label: "Top" },
] as const;

function Toggle({
  pressed,
  onClick,
  icon,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-3 text-meta font-medium transition-colors duration-150 pointer-coarse:min-h-11 [&_svg]:size-3.5",
        pressed
          ? "border-accent/30 bg-accent-soft text-accent"
          : "border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

export function SearchFilters({
  state,
  categories,
}: {
  state: SearchFilterState;
  categories: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const update = (patch: Partial<SearchFilterState>) => router.push(searchHref({ ...state, ...patch }));
  const active = Boolean(state.category) || state.city !== "all" || state.bestAnswer || state.verified;

  return (
    <div role="group" aria-label="Search filters" className="mb-6 flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex w-full flex-col gap-1 sm:w-56">
          <Label htmlFor="search-category">Category</Label>
          <Select
            id="search-category"
            value={state.category}
            onChange={(event) => update({ category: event.target.value })}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>
        <SegmentedControl
          label="City"
          value={state.city}
          options={cityOptions}
          onChange={(city) => update({ city })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle
          pressed={state.bestAnswer}
          onClick={() => update({ bestAnswer: !state.bestAnswer })}
          icon={<MessageSquareCheck aria-hidden strokeWidth={1.75} />}
        >
          Has best answer
        </Toggle>
        <Toggle
          pressed={state.verified}
          onClick={() => update({ verified: !state.verified })}
          icon={<BadgeCheck aria-hidden strokeWidth={1.75} />}
        >
          Verified
        </Toggle>
        {active && (
          <button
            type="button"
            onClick={() => update({ category: "", city: "all", bestAnswer: false, verified: false })}
            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-meta text-muted transition-colors hover:text-foreground pointer-coarse:min-h-11 [&_svg]:size-3.5"
          >
            <X aria-hidden strokeWidth={1.75} />
            Clear filters
          </button>
        )}
        <div className="sm:ml-auto">
          <SegmentedControl
            label="Sort by"
            value={state.sort}
            options={sortOptions}
            onChange={(sort) => update({ sort })}
          />
        </div>
      </div>
    </div>
  );
}
