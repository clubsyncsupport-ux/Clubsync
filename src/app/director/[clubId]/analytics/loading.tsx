import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Analytics</h1>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <div className="space-y-2 p-4">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <div className="space-y-3 p-5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-36 w-full rounded-xl" />
        </div>
      </Card>
    </div>
  );
}
