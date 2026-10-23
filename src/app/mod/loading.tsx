import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Moderation pages query before rendering anything, so switching sections shows this while they load.
export default function ModLoading() {
  return (
    <div className="grid gap-3" aria-busy>
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <Skeleton className={i % 2 ? "h-5 w-1/2" : "h-5 w-2/3"} />
          <Skeleton className="mt-3 h-3.5 w-40" />
          <Skeleton className="mt-5 h-9 w-48" />
        </Card>
      ))}
    </div>
  );
}
