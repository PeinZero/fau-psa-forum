import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors ThreadForm's layout so nothing jumps when the form streams in. */
export function ThreadFormSkeleton() {
  return (
    <div className="flex flex-col gap-7" aria-busy aria-label="Loading form">
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-10" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-16" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-5 w-10" />
        <Skeleton className="h-9 w-80 max-w-full rounded-lg" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-end justify-between">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="flex justify-end border-t border-border pt-5">
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}
