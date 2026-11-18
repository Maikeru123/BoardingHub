import { Skeleton } from "@/components/ui/skeleton"
export default function Loading() {
  return (
    <div>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-8 h-120 rounded-xl" />
    </div>
  )
}
