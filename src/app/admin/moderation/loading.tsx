import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Moderation & Audit Log</h1>
      <Skeleton className="mt-1 h-4 w-72" />
      <div className="mt-5 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
