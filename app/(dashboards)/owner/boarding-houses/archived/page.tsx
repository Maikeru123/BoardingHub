import { DashboardHeader, LinkButton } from "@/components/shared"
import { HouseCards } from "@/components/management-tables"
import { getOwnerData } from "@/lib/data"

export default async function ArchivedBoardingHousesPage() {
  const { houses, rooms, photos, listings, listingVerifications } =
    await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="Archived boarding houses"
        description="Archived properties are hidden from tenants and discovery while their historical records remain intact."
        action={
          <LinkButton href="/owner/boarding-houses" variant="outline">
            Back to active properties
          </LinkButton>
        }
      />
      <HouseCards
        houses={houses.filter((house) => house.status === "archived")}
        rooms={rooms}
        photos={photos}
        listings={listings}
        listingVerifications={listingVerifications}
        emptyTitle="No archived boarding houses"
        emptyDescription="Properties you archive will appear here with their historical data intact."
      />
    </>
  )
}
