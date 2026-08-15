import { Card, CardContent } from "@/components/ui/card";
import { Skeleton, SkeletonCircle, SkeletonCard } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">My Service Hours</h1>
        <Skeleton className="h-4 w-24" />
      </div>

      <Card className="mt-5">
        <CardContent className="flex flex-col items-center p-6">
          <SkeletonCircle size={120} />
          <div className="mt-4 grid w-full grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="h-3 w-10" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Skeleton className="mb-2 h-3 w-32" />
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
