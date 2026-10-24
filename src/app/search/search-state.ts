import { SEARCH_QUERY_MAX } from "@/components/command/types";

export type SearchSort = "relevance" | "hot" | "top" | "new";
export type SearchCity = "all" | "erlangen" | "nuremberg";

export type SearchFilterState = {
  q: string;
  category: string;
  city: SearchCity;
  bestAnswer: boolean;
  verified: boolean;
  sort: SearchSort;
};

export const sortTabs: readonly { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "hot", label: "Hot" },
  { value: "top", label: "Top" },
  { value: "new", label: "New" },
];

type Raw = { [key: string]: string | string[] | undefined };

function param(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function parseSort(value: string): SearchSort {
  // "newest" is the old spelling still found in shared links.
  if (value === "newest") return "new";
  return sortTabs.some((tab) => tab.value === value) ? (value as SearchSort) : "relevance";
}

export function parseSearchState(raw: Raw, categorySlugs: readonly string[]): SearchFilterState {
  const category = param(raw.category);
  const city = param(raw.city);
  return {
    q: param(raw.q).slice(0, SEARCH_QUERY_MAX).trim(),
    category: categorySlugs.includes(category) ? category : "",
    city: city === "erlangen" || city === "nuremberg" ? city : "all",
    bestAnswer: param(raw.best) === "1",
    verified: param(raw.verified) === "1",
    sort: parseSort(param(raw.sort)),
  };
}

/** The URL parameters for a state; page is left out so any change starts again at page 1. */
export function searchParamsOf(state: SearchFilterState): Record<string, string | undefined> {
  return {
    q: state.q || undefined,
    category: state.category || undefined,
    city: state.city === "all" ? undefined : state.city,
    best: state.bestAnswer ? "1" : undefined,
    verified: state.verified ? "1" : undefined,
    sort: state.sort === "relevance" ? undefined : state.sort,
  };
}

export function searchHref(state: SearchFilterState): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParamsOf(state))) if (value) params.set(key, value);
  const qs = params.toString();
  return qs ? `/search?${qs}` : "/search";
}
