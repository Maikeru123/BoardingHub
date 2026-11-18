"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { saveRoom } from "@/actions/properties"
import { uploadRoomPhoto } from "@/actions/photos"
import { roomSchema, type RoomInput } from "@/lib/validation"
import { Form, FormField } from "@/components/ui/form"
import { FormSection, FormFooter } from "./editor"
import { useActionResult } from "@/hooks/use-action-result"
import { NewBoardingHousePhotoPicker } from "@/components/boarding-house/new-photo-picker"
import { toast } from "sonner"
import type { House, Room } from "@/types/domain"
export function RoomForm({
  room,
  houses,
  houseId,
}: {
  room?: Room
  houses: House[]
  houseId?: string
}) {
  const router = useRouter()
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [photoError, setPhotoError] = useState<string>()
  const form = useForm<RoomInput>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      boarding_house_id:
        room?.boarding_house_id || houseId || houses[0]?.id || "",
      room_number: room?.room_number || "",
      room_type: (room?.room_type || "single") as RoomInput["room_type"],
      monthly_rent: room?.monthly_rent ?? 0,
      capacity: room?.capacity ?? 1,
      status: (room?.status || "available") as RoomInput["status"],
      description: room?.description || "",
    },
  })
  const { run, error } = useActionResult()
  const roomType = useWatch({ control: form.control, name: "room_type" })

  useEffect(() => {
    if (roomType === "single")
      form.setValue("capacity", 1, { shouldValidate: true })
  }, [form, roomType])

  return (
    <Form {...form}>
      <form
        className="max-w-4xl space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          setPhotoError(undefined)
          setUploadProgress(0)
          const result = await run(() => saveRoom(room?.id || null, values))
          if (!result || room) return
          const roomId = result.entityId
          if (!roomId) {
            setPhotoError(
              "The room was saved, but its identifier was not returned. Open it from the rooms page to add photos."
            )
            router.push("/owner/rooms")
            return
          }
          for (let index = 0; index < photoFiles.length; index += 1) {
            const data = new FormData()
            data.set("photo", photoFiles[index])
            const upload = await uploadRoomPhoto(roomId, data)
            if (upload.error) {
              toast.error(upload.error)
              router.push(`/owner/rooms/${roomId}/edit?photo-upload=retry`)
              return
            }
            setUploadProgress(index + 1)
          }
          if (photoFiles.length)
            toast.success(
              `${photoFiles.length} room photo${photoFiles.length === 1 ? "" : "s"} uploaded.`
            )
          router.push("/owner/rooms")
        })}
      >
        <FormSection
          title="Room details"
          description="Single rooms automatically have a capacity of one."
        >
          <FormField
            control={form.control}
            name="boarding_house_id"
            label="Boarding house"
            options={houses.map((h) => ({ value: h.id, label: h.name }))}
            disabled={Boolean(room)}
            required
          />
          <FormField
            control={form.control}
            name="room_number"
            label="Room name / number"
            placeholder="e.g. Room 101"
          />
          <FormField
            control={form.control}
            name="room_type"
            label="Room type"
            options={[
              { value: "single", label: "Single" },
              { value: "shared", label: "Shared" },
              { value: "bed_space", label: "Bed space" },
              { value: "studio", label: "Studio" },
            ]}
            required
          />
          <FormField
            control={form.control}
            name="status"
            label="Room status"
            options={[
              { value: "available", label: "Available" },
              { value: "maintenance", label: "Maintenance" },
              { value: "archived", label: "Archived" },
            ]}
            description="General room usability. This does not indicate availability for specific dates."
          />
          <FormField
            control={form.control}
            name="monthly_rent"
            label="Monthly rent (PHP)"
            type="number"
            step="0.01"
            required
          />
          {roomType !== "single" && (
            <FormField
              control={form.control}
              name="capacity"
              label="Capacity (people)"
              type="number"
              step="1"
              required
            />
          )}
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="description"
              label="Description"
              type="textarea"
              placeholder="Room size, furnishings, and other useful details…"
            />
          </div>
        </FormSection>
        {!room && (
          <FormSection
            title="Room photos"
            description="Choose up to 12 photos. They will upload automatically after the room is created."
          >
            <NewBoardingHousePhotoPicker
              subject="room"
              disabled={form.formState.isSubmitting}
              progress={uploadProgress}
              onFilesChange={setPhotoFiles}
            />
          </FormSection>
        )}
        <FormFooter
          pending={form.formState.isSubmitting}
          error={photoError || error}
          cancel="/owner/rooms"
          title={room ? "Save room" : "Create Room"}
          pendingTitle={
            room
              ? "Saving room…"
              : photoFiles.length
                ? `Creating and uploading ${photoFiles.length} photo${photoFiles.length === 1 ? "" : "s"}…`
                : "Creating room…"
          }
        />
      </form>
    </Form>
  )
}
