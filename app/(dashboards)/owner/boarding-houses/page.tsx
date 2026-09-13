import { Plus } from "lucide-react"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { HouseCards } from "@/components/management-tables"
export default async function HousesPage() {
  const { houses, rooms } = await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="Boarding houses"
        description="A home for all your properties. Manage details, locations, and amenities."
        action={
          <LinkButton href="/owner/boarding-houses/new">
            <Plus className="size-4" />
            Add boarding house
          </LinkButton>
        }
      />
      <HouseCards houses={houses} rooms={rooms} />
    </>
  )
}
