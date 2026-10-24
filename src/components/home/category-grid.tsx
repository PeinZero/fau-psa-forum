import Link from "next/link";

import { CategoryIcon } from "@/components/thread/category-icon";
import { fetchCategoriesWithCounts } from "@/components/thread/thread-list";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";

const grid = "grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 lg:grid-cols-3";
const tile =
  "group flex min-h-11 items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 " +
  "transition-[background-color,border-color] duration-200 ease-out hover:border-border-strong/50 hover:bg-surface-hover";

export async function CategoryGrid() {
  const categories = await fetchCategoriesWithCounts();
  return (
    <ul className={grid}>
      {categories.map((category, i) => (
        <li key={category.id} className="animate-fade-up" style={stagger(i)}>
          <Link href={`/c/${category.slug}`} title={category.description ?? undefined} className={tile}>
            <CategoryIcon
              slug={category.slug}
              className="size-8 transition-colors duration-200 group-hover:border-accent/30 group-hover:text-accent [&_svg]:size-4"
            />
            <span className="min-w-0 flex-1 truncate text-body font-medium text-foreground">{category.name}</span>
            <span className="shrink-0 text-meta tabular-nums text-subtle">
              {category.threadCount}
              <span className="sr-only"> {category.threadCount === 1 ? "thread" : "threads"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CategoryGridSkeleton() {
  return (
    <div role="status" aria-busy="true" className={grid}>
      <span className="sr-only">Loading categories…</span>
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-3.5 w-5" />
        </div>
      ))}
    </div>
  );
}
