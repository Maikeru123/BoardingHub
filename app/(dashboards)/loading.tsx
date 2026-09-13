import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
