import { Archive, Plus } from "lucide-react"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { HouseCards } from "@/components/management-tables"
export default async function HousesPage() {
  const { houses, rooms, photos, listings, listingVerifications } =
    await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="Boarding houses"
        description="A home for all your properties. Manage details, locations, and amenities."
        action={
          <div className="flex gap-2">
            <LinkButton
              href="/owner/boarding-houses/archived"
              variant="outline"
            >
              <Archive className="size-4" /> Archived
            </LinkButton>
            <LinkButton href="/owner/boarding-houses/new">
              <Plus className="size-4" /> Add boarding house
            </LinkButton>
          </div>
        }
      />
      <HouseCards
        houses={houses.filter((house) => house.status !== "archived")}
        rooms={rooms}
        photos={photos}
        listings={listings}
        listingVerifications={listingVerifications}
      />
    </>
  )
}
