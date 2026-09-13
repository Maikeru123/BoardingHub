import { getAdminData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { ListingTable } from "@/components/management-tables"
export default async function AdminListingsPage() {
  const { listings, houses } = await getAdminData()
  return (
    <>
      <DashboardHeader
        title="All listings"
        description="A complete view of listing statuses across BoardingHub."
      />
      <ListingTable
        listings={listings}
        houses={houses}
        base="/admin/verifications"
      />
    </>
  )
}
