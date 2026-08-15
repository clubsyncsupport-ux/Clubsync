import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Service Hours</h1>
      <Skeleton className="mt-1 h-4 w-40" />
      <SkeletonTable rows={8} cols={6} className="mt-5" />
    </div>
  );
}
