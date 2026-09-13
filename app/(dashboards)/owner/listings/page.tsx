import { Plus } from "lucide-react"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { ListingTable } from "@/components/management-tables"
export default async function ListingsPage() {
  const { houses, listings } = await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="My listings"
        description="From first draft to published listing. Keep track of every step."
        action={
          <LinkButton href="/owner/listings/new">
            <Plus className="size-4" />
            Create listing
          </LinkButton>
        }
      />
      <ListingTable listings={listings} houses={houses} />
    </>
  )
}
