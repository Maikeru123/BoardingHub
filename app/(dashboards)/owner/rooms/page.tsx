import Link from "next/link"
import { Plus } from "lucide-react"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { RoomTable } from "@/components/management-tables"
export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>
}) {
  const { house } = await searchParams
  const { houses, rooms } = await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="Rooms"
        description="Manage room details, monthly rent, capacity, and general usability."
        action={
          houses.length > 0 && (
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
      />
    </>
  )
}
