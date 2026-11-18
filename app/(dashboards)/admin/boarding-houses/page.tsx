import { getAdminData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { HouseCards, RoomTable } from "@/components/management-tables"
export default async function AdminHousesPage() {
  const { houses, rooms, photos, listings, listingVerifications } =
    await getAdminData()
  return (
    <>
      <DashboardHeader
        title="Boarding houses"
        description="An overview of properties registered on BoardingHub."
      />
      <HouseCards
        houses={houses}
        rooms={rooms}
        photos={photos}
        listings={listings}
        listingVerifications={listingVerifications}
        admin
      />
      <section className="mt-10">
        <h2 className="mb-5 text-lg font-semibold">Active rooms</h2>
        <RoomTable
          rooms={rooms.filter((room) => room.status !== "archived")}
          houses={houses}
          admin
        />
      </section>
    </>
  )
}
