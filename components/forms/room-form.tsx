"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { saveRoom } from "@/actions/properties"
import { roomSchema, type RoomInput } from "@/lib/validation"
import { Form, FormField } from "@/components/ui/form"
import { FormSection, FormFooter } from "./editor"
import { useActionResult } from "@/hooks/use-action-result"
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
  return (
    <Form {...form}>
      <form
        className="max-w-4xl space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          await run(() => saveRoom(room?.id || null, values))
        })}
      >
        <FormSection
          title="Room details"
          description="Room changes return affected listings to draft for review."
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
              { value: "inactive", label: "Inactive" },
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
          <FormField
            control={form.control}
            name="capacity"
            label="Capacity (people)"
            type="number"
            step="1"
            required
          />
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
        <FormFooter
          pending={form.formState.isSubmitting}
          error={error}
          cancel="/owner/rooms"
          title={room ? "Save room" : "Add room"}
        />
      </form>
    </Form>
  )
}
