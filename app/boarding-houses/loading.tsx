import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() {
  return (
    <main className="page-container py-14">
      <Skeleton className="h-10 w-80" />
      <Skeleton className="mt-4 h-5 w-120 max-w-full" />
      <Skeleton className="mt-10 h-14 w-full rounded-xl" />
      <div className="mt-7 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Skeleton className="hidden h-150 rounded-xl lg:block" />
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-105 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  )
}
