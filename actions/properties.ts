"use server"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { houseSchema, roomSchema, uuid } from "@/lib/validation"
import { databaseError } from "@/lib/action-errors"
import type { ActionResult } from "@/types/domain"

export async function saveHouse(
  id: string | null,
  values: unknown
): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  const parsed = houseSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (id && !uuid.safeParse(id).success) return { error: "Invalid property." }
  const { amenity_ids, ...details } = parsed.data
  const { error } = await supabase.rpc("save_boarding_house", {
    house_id: id,
    details,
    amenity_ids,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return {
    success: "Boarding house saved.",
    redirectTo: "/owner/boarding-houses",
  }
}
export async function deactivateHouse(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid property." }
  const { data, error } = await supabase
    .from("boarding_houses")
    .update({ status: "inactive" })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .single()
  if (error || !data)
    return { error: error ? databaseError(error) : "Property not found." }
  revalidatePath("/", "layout")
  return {
    success: "Boarding house deactivated. Associated listings are now drafts.",
  }
}
export async function saveRoom(
  id: string | null,
  values: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireRole("owner")
  const parsed = roomSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (id && !uuid.safeParse(id).success) return { error: "Invalid room." }
  const { data: house } = await supabase
    .from("boarding_houses")
    .select("id")
    .eq("id", parsed.data.boarding_house_id)
    .eq("owner_id", user.id)
    .single()
  if (!house) return { error: "Choose one of your own boarding houses." }
  const payload = {
    ...parsed.data,
    room_number: parsed.data.room_number || null,
  }
  const result = id
    ? await supabase
        .from("rooms")
        .update(payload)
        .eq("id", id)
        .eq("boarding_house_id", house.id)
        .select("id")
        .single()
    : await supabase.from("rooms").insert(payload).select("id").single()
  if (result.error) return { error: databaseError(result.error) }
  revalidatePath("/", "layout")
  return { success: "Room saved.", redirectTo: "/owner/rooms" }
}
export async function deactivateRoom(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid room." }
  const { error } = await supabase
    .from("rooms")
    .update({ status: "inactive" })
    .eq("id", id)
    .select("id")
    .single()
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return {
    success: "Room deactivated. Affected listings require a new review.",
  }
}
