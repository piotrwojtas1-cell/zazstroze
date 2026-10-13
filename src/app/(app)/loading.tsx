import { Skeleton } from "@/components/ui/misc";

export default function Loading() {
  return (
    <div role="status" aria-label="Ładowanie" className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <span className="sr-only">Ładowanie…</span>
    </div>
  );
}
