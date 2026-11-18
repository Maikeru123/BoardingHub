import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() {
  return (
    <main className="page-container py-10">
      <Skeleton className="h-10 w-80" />
      <Skeleton className="mt-8 aspect-[16/6] w-full rounded-2xl" />
      <div className="mt-8 grid gap-7 xl:grid-cols-[1fr_340px]">
        <Skeleton className="h-150 rounded-xl" />
        <Skeleton className="h-100 rounded-xl" />
      </div>
    </main>
  )
}
