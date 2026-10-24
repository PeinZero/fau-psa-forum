import { browseHref, type BrowseSort } from "@/components/browse/params";

export type HomeSort = Extract<BrowseSort, "hot" | "new" | "top">;

export const homeSorts: readonly { value: HomeSort; label: string }[] = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
];

/** Anything unknown falls back to Hot, the default view for a newcomer. */
export function parseHomeSort(raw: string | string[] | undefined): HomeSort {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return homeSorts.find((sort) => sort.value === value?.trim())?.value ?? "hot";
}

export function homeSortHref(sort: HomeSort): string {
  return sort === "hot" ? "/" : `/?sort=${sort}`;
}

/** The full list on /browse continues where the home feed stops, on the same sort. */
export function browseAllHref(sort: HomeSort): string {
  return browseHref("/browse", { sort, period: "week", q: "" });
}
