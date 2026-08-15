import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      <Card>
        <div className="space-y-2 p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        ))}
      </div>

      <div>
        <Skeleton className="mb-3 h-5 w-36" />
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
