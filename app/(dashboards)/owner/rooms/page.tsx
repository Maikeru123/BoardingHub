import Link from "next/link"
import { Plus } from "lucide-react"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { RoomTable } from "@/components/management-tables"
import { getRentalRecords } from "@/lib/data/rentals"
export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>
}) {
  const { house } = await searchParams
  const [{ houses: allHouses, rooms: allRooms }, rentals] = await Promise.all([
    getOwnerData(),
    getRentalRecords("owner"),
  ])
  const houses = allHouses.filter((item) => item.status === "active")
  const approvedHouses = houses.filter(
    (item) => item.verification_status === "approved"
  )
  const activeHouseIds = new Set(houses.map((item) => item.id))
  const rooms = allRooms.filter(
    (item) =>
      activeHouseIds.has(item.boarding_house_id) && item.status !== "archived"
  )
  return (
    <>
      <DashboardHeader
        title="Rooms"
        description="Manage room details, monthly rent, capacity, and general usability."
        action={
          approvedHouses.length > 0 && (
            <LinkButton href="/owner/rooms/new">
              <Plus className="size-4" />
              Add room
            </LinkButton>
          )
        }
      />
      {house && (
        <p className="mb-5 text-sm text-muted-foreground">
          Showing rooms in{" "}
          {houses.find((h) => h.id === house)?.name || "selected property"} ·{" "}
          <Link href="/owner/rooms" className="text-primary">
            Show all rooms
          </Link>
        </p>
      )}
      <RoomTable
        rooms={
          house ? rooms.filter((r) => r.boarding_house_id === house) : rooms
        }
        houses={houses}
        occupiedRoomIds={rentals
          .filter((item) =>
            ["active", "ending"].includes(item.transaction?.status || "")
          )
          .map((item) => item.room.id)}
        reservedRoomIds={rentals
          .filter((item) => item.transaction?.status === "reserved")
          .map((item) => item.room.id)}
      />
    </>
  )
}
