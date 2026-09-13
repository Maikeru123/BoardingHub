import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() {
  return (
    <main
      id="main-content"
      aria-label="Loading page"
      role="status"
      className="page-container space-y-6 py-16"
    >
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <Skeleton className="h-96 w-full rounded-2xl" />
      <span className="sr-only">Loading…</span>
    </main>
  )
}
