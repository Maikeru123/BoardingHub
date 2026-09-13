import { getOwnerData } from "@/lib/data"
import { DashboardHeader, EmptyState, LinkButton } from "@/components/shared"
import { RoomForm } from "@/components/forms/room-form"
export default async function NewRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>
}) {
  const { house } = await searchParams
  const { houses } = await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="Add a room"
        description="Create a clear picture of the space you offer."
      />
      {houses.length ? (
        <RoomForm
          houses={houses}
          houseId={houses.some((h) => h.id === house) ? house : undefined}
        />
      ) : (
        <EmptyState
          title="Add a boarding house first."
          description="Rooms belong to a property. Create your property before adding rooms."
          action={
            <LinkButton href="/owner/boarding-houses/new">
              Add boarding house
            </LinkButton>
          }
        />
      )}
    </>
  )
}
