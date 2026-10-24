import { ThreadListSkeleton } from "@/components/thread/thread-list";
import { Skeleton } from "@/components/ui/skeleton";

export function BrowseControlsSkeleton() {
  return (
    <div className="mb-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-60 rounded-lg" />
        <Skeleton className="h-9 w-56 rounded-lg lg:ml-auto" />
      </div>
      <Skeleton className="h-9 w-full rounded-md" />
    </div>
  );
}

export function BrowseSkeleton() {
  return (
    <>
      <BrowseControlsSkeleton />
      <Skeleton className="mb-3 h-4 w-24" />
      <ThreadListSkeleton rows={8} />
    </>
  );
}
