import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Users</h1>
      <Skeleton className="mt-4 h-9 w-full max-w-md rounded-xl" />
      <SkeletonTable rows={8} cols={4} className="mt-5" />
    </div>
  );
}
