import { notFound } from "next/navigation"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader, Panel } from "@/components/shared"
import { RoomForm } from "@/components/forms/room-form"
import { RoomPhotoManager } from "@/components/rooms/photo-manager"
import { Alert, AlertDescription } from "@/components/ui/alert"
export default async function EditRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ "photo-upload"?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const { houses, rooms, roomPhotos } = await getOwnerData()
  const room = rooms.find((r) => r.id === id)
  if (!room) notFound()
  return (
    <>
      <DashboardHeader
        title="Edit room"
        description="Keep your room information accurate and up to date."
      />
      {query["photo-upload"] === "retry" && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            The room was created, but one or more photos did not upload. Add the
            remaining room photos below; the room details are intact.
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-6">
        <Panel
          title="Room photos"
          description="Upload, replace, remove, and choose the primary image tenants see for this room."
        >
          <RoomPhotoManager
            roomId={room.id}
            photos={roomPhotos.filter((photo) => photo.room_id === room.id)}
          />
        </Panel>
      </div>
      <RoomForm room={room} houses={houses} />
    </>
  )
}
