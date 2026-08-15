import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Calendar</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-40 rounded-xl" />
        <Skeleton className="h-9 w-48 rounded-xl" />
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    </div>
  );
}
