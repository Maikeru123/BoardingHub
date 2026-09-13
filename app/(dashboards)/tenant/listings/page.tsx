import { requireRole } from "@/lib/auth"
import { DashboardHeader } from "@/components/shared"
import { ExploreListings } from "@/components/listings/explore"
export default async function TenantListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  await requireRole("tenant")
  const { q, page } = await searchParams
  return (
    <>
      <DashboardHeader
        title="Available boarding houses"
        description="Explore reviewed places, room details, and amenities."
      />
      <ExploreListings
        base="/tenant/listings"
        search={q}
        page={Math.max(1, Number(page) || 1)}
      />
    </>
  )
}
