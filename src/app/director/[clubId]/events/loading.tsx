import { SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 animate-fade-in">
      <h1 className="text-2xl font-bold tracking-tight text-text-primary">Events</h1>
      <SkeletonList count={5} className="mt-6" />
    </div>
  );
}
