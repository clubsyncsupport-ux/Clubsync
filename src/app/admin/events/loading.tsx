import { SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Events</h1>
      <SkeletonList count={6} className="mt-5" />
    </div>
  );
}
