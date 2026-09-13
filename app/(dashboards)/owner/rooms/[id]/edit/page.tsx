import { notFound } from "next/navigation"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { RoomForm } from "@/components/forms/room-form"
export default async function EditRoomPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { houses, rooms } = await getOwnerData()
  const room = rooms.find((r) => r.id === id)
  if (!room) notFound()
  return (
    <>
      <DashboardHeader
        title="Edit room"
        description="Keep your room information accurate and up to date."
      />
      <RoomForm room={room} houses={houses} />
    </>
  )
}
