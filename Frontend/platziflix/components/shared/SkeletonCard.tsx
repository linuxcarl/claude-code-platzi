import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonCard() {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "var(--card)" }}>
      <Skeleton className="w-full aspect-video" style={{ background: "var(--secondary)" }} />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" style={{ background: "var(--secondary)" }} />
        <Skeleton className="h-3 w-1/2" style={{ background: "var(--secondary)" }} />
      </div>
    </div>
  );
}
