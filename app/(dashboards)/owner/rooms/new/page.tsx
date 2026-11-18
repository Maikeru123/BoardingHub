import { getOwnerData } from "@/lib/data"
import { DashboardHeader, EmptyState, LinkButton } from "@/components/shared"
import { RoomForm } from "@/components/forms/room-form"
export default async function NewRoomPage({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>
}) {
  const { house } = await searchParams
  const { houses: allHouses } = await getOwnerData()
  const houses = allHouses.filter(
    (item) =>
      item.status === "active" && item.verification_status === "approved"
  )
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
          title="Verify a boarding house first."
          description="This boarding house must be verified before rooms can be added. Upload property photos and submit it for administrator review."
          action={
            <LinkButton href="/owner/boarding-houses">
              View boarding houses
            </LinkButton>
          }
        />
      )}
    </>
  )
}
