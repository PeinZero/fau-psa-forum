import { parsePage } from "@/components/ui/pagination";

export type BrowseSort = "hot" | "new" | "top" | "active";
export type BrowsePeriod = "week" | "month" | "year" | "all";
export type BrowseCity = "erlangen" | "nuremberg";

/** Matches the database's case-insensitive substring filter, which ignores longer queries. */
export const BROWSE_QUERY_MAX = 100;

export const sortOptions: readonly { value: BrowseSort; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
  { value: "active", label: "Active" },
];

export const periodOptions: readonly { value: BrowsePeriod; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "all", label: "All time" },
];

export type BrowseState = {
  sort: BrowseSort;
  /** Only meaningful for `top`; the other sorts rank across all time. */
  period: BrowsePeriod;
  city?: BrowseCity;
  /** Category slug; category pages fix it through their path instead. */
  category?: string;
  q: string;
  page: number;
};

type RawParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function oneOf<T extends string>(value: string, options: readonly { value: T }[], fallback: T): T {
  return options.find((option) => option.value === value)?.value ?? fallback;
}

/** Top defaults to this week so a newcomer sees what matters now, not the all-time classics. */
export function parseBrowseParams(raw: RawParams): BrowseState {
  const city = first(raw.city);
  return {
    sort: oneOf(first(raw.sort), sortOptions, "hot"),
    period: oneOf(first(raw.period), periodOptions, "week"),
    city: city === "erlangen" || city === "nuremberg" ? city : undefined,
    category: first(raw.category) || undefined,
    q: first(raw.q).slice(0, BROWSE_QUERY_MAX).trim(),
    page: parsePage(raw.page),
  };
}

/** Query params for links and pagination; defaults are left out so URLs stay short. */
export function browseParams(state: Omit<BrowseState, "page">): Record<string, string | undefined> {
  return {
    sort: state.sort === "hot" ? undefined : state.sort,
    period: state.sort === "top" && state.period !== "week" ? state.period : undefined,
    category: state.category,
    city: state.city,
    q: state.q || undefined,
  };
}

/** Any change of sort or filter starts again at page 1. */
export function browseHref(path: string, state: Omit<BrowseState, "page">): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(browseParams(state))) {
    if (value) query.set(key, value);
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export function browseTitle(state: Pick<BrowseState, "sort" | "period">): string {
  switch (state.sort) {
    case "hot":
      return "Hot threads";
    case "new":
      return "New threads";
    case "active":
      return "Recently active threads";
    case "top":
      return state.period === "all" ? "Top threads of all time" : `Top threads this ${state.period}`;
  }
}
