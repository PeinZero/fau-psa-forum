import { SegmentedControl } from "../../ui/segmented-control";

/*
 * The row of segmented controls at the top of /browse (src/components/browse/browse-controls.tsx):
 * the sort tabs on the left, the city filter pushed to the right as on a wide screen.
 */

const sortOptions = [
  { value: "hot", label: "Hot" },
  { value: "new", label: "New" },
  { value: "top", label: "Top" },
  { value: "active", label: "Active" },
] as const;

const cityOptions = [
  { value: "all", label: "All cities" },
  { value: "erlangen", label: "Erlangen" },
  { value: "nuremberg", label: "Nuremberg" },
] as const;

export type BrowseSort = (typeof sortOptions)[number]["value"];
export type BrowseCity = (typeof cityOptions)[number]["value"];

/** Site px of the window around the row. */
export const BROWSE_CARD = { width: 516, height: 64 };

export function BrowseControlsCard({ sort = "hot", city = "all" }: { sort?: BrowseSort; city?: BrowseCity }) {
  return (
    <div className="absolute inset-0 flex items-center gap-2 bg-background px-4">
      <SegmentedControl value={sort} options={sortOptions} />
      <SegmentedControl value={city} options={cityOptions} className="ml-auto" />
    </div>
  );
}
