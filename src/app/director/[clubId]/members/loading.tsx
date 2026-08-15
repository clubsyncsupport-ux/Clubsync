import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
      <div className="mt-5 space-y-4">
        {Array.from({ length: 3 }).map((_, group) => (
          <div key={group} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ))}
      </div>
    </div>
  );
}
