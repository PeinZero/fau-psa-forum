import { SegmentedLinks } from "@/components/ui/segmented-control";
import { cityLabels } from "@/lib/labels";

import { FilterForm } from "./filter-form";
import { browseHref, periodOptions, sortOptions, type BrowseCity, type BrowseState } from "./params";

const cityOptions: readonly { value: BrowseCity | undefined; label: string }[] = [
  { value: undefined, label: "All cities" },
  { value: "erlangen", label: cityLabels.erlangen },
  { value: "nuremberg", label: cityLabels.nuremberg },
];

/** Sort tabs, the Top period, city and search; every choice lives in the URL. */
export function BrowseControls({
  path,
  state,
  categories,
  searchPlaceholder,
}: {
  path: string;
  state: BrowseState;
  categories?: { slug: string; name: string }[];
  searchPlaceholder: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedLinks
          label="Sort threads"
          items={sortOptions.map((option) => ({
            href: browseHref(path, { ...state, sort: option.value }),
            label: option.label,
            current: option.value === state.sort,
          }))}
        />
        {state.sort === "top" && (
          <SegmentedLinks
            label="Time period"
            items={periodOptions.map((option) => ({
              href: browseHref(path, { ...state, period: option.value }),
              label: option.label,
              current: option.value === state.period,
            }))}
          />
        )}
        <SegmentedLinks
          label="Filter by city"
          className="lg:ml-auto"
          items={cityOptions.map((option) => ({
            href: browseHref(path, { ...state, city: option.value }),
            label: option.label,
            current: option.value === state.city,
          }))}
        />
      </div>
      <FilterForm path={path} state={state} categories={categories} placeholder={searchPlaceholder} />
    </div>
  );
}
