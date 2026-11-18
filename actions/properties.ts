"use server"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { houseSchema, reviewSchema, roomSchema, uuid } from "@/lib/validation"
import { databaseError } from "@/lib/action-errors"
import {
  PhilippineLocationError,
  resolvePhilippineAddressCodes,
} from "@/lib/locations/philippines"
import type { ActionResult } from "@/types/domain"

export async function saveHouse(
  id: string | null,
  values: unknown
): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  const parsed = houseSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (id && !uuid.safeParse(id).success) return { error: "Invalid property." }
  const { amenity_ids, ...submittedDetails } = parsed.data
  let location
  try {
    location = await resolvePhilippineAddressCodes({
      provinceCode: submittedDetails.province_code,
      cityMunicipalityCode: submittedDetails.city_municipality_code,
      barangayCode: submittedDetails.barangay_code,
    })
  } catch (error) {
    if (!(error instanceof PhilippineLocationError))
      console.error("Unexpected address validation failure", error)
    return {
      error:
        "We could not validate the Philippine address right now. Please try again.",
    }
  }
  if (!location)
    return {
      error:
        "The province, city or municipality, and barangay do not match. Choose them again.",
    }
  const details = {
    ...submittedDetails,
    province: location.province.name,
    city_municipality: location.cityMunicipality.name,
    barangay: location.barangay.name,
  }
  const { data: savedId, error } = await supabase.rpc("save_boarding_house", {
    house_id: id,
    details,
    amenity_ids,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return {
    success: id ? "Boarding house saved." : "Boarding house created.",
    redirectTo: id ? "/owner/boarding-houses" : undefined,
    entityId: savedId,
  }
}
export async function archiveHouse(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid property." }
  const { data, error } = await supabase
    .from("boarding_houses")
    .update({ status: "archived" })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select("id")
    .single()
  if (error || !data)
    return { error: error ? databaseError(error) : "Property not found." }
  revalidatePath("/", "layout")
  return {
    success: "Boarding house archived. Its historical data is preserved.",
  }
}
export async function restoreHouse(id: string): Promise<ActionResult> {
  const { supabase, user } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid property." }
  const { data, error } = await supabase
    .from("boarding_houses")
    .update({ status: "active" })
    .eq("id", id)
    .eq("owner_id", user.id)
    .eq("status", "archived")
    .select("id")
    .single()
  if (error || !data)
    return { error: error ? databaseError(error) : "Property not found." }
  revalidatePath("/", "layout")
  return { success: "Boarding house restored to active properties." }
}
export async function saveRoom(
  id: string | null,
  values: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireRole("owner")
  const parsed = roomSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (id && !uuid.safeParse(id).success) return { error: "Invalid room." }
  const { data: house, error: houseError } = await supabase
    .from("boarding_houses")
    .select("id, verification_status")
    .eq("id", parsed.data.boarding_house_id)
    .eq("owner_id", user.id)
    .eq("status", "active")
    .eq("verification_status", "approved")
    .single()
  if (houseError) return { error: databaseError(houseError) }
  if (!house)
    return {
      error: "This boarding house must be verified before rooms can be added.",
    }
  const payload = {
    ...parsed.data,
    capacity: parsed.data.room_type === "single" ? 1 : parsed.data.capacity,
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
  return {
    success: "Room saved.",
    redirectTo: id ? "/owner/rooms" : undefined,
    entityId: result.data.id,
  }
}
export async function archiveRoom(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid room." }
  const { error } = await supabase
    .from("rooms")
    .update({ status: "archived" })
    .eq("id", id)
    .select("id")
    .single()
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return {
    success: "Room archived. Its rental and payment history is preserved.",
  }
}

export async function moderateRoom(
  id: string,
  status: "available" | "maintenance" | "archived"
): Promise<ActionResult> {
  const { supabase } = await requireRole("admin")
  if (!uuid.safeParse(id).success) return { error: "Invalid room." }
  const { error } = await supabase.rpc("moderate_room", {
    target_room: id,
    new_status: status,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return {
    success:
      status === "archived"
        ? "Room archived. Historical records were preserved."
        : `Room marked ${status.replaceAll("_", " ")}.`,
  }
}

export async function submitBoardingHouse(
  id: string
): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid property." }
  const { error } = await supabase.rpc("submit_boarding_house", {
    target_house: id,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return { success: "Boarding house submitted for administrator review." }
}

export async function reviewBoardingHouse(
  id: string,
  values: unknown
): Promise<ActionResult> {
  const { supabase } = await requireRole("admin")
  const parsed = reviewSchema.safeParse(values)
  if (!uuid.safeParse(id).success) return { error: "Invalid property." }
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { error } = await supabase.rpc("review_boarding_house", {
    target_house: id,
    decision: parsed.data.decision,
    review_remarks: parsed.data.remarks,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return {
    success:
      parsed.data.decision === "approved"
        ? "Boarding house approved. The owner can now add rooms."
        : "Review saved and sent to the owner.",
    redirectTo: "/admin/verifications",
  }
}
