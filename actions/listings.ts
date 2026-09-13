"use server"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { listingSchema, reviewSchema, uuid } from "@/lib/validation"
import { databaseError } from "@/lib/action-errors"
import type { ActionResult } from "@/types/domain"

export async function saveListing(
  id: string | null,
  values: unknown
): Promise<ActionResult> {
  const { supabase, user } = await requireRole("owner")
  const parsed = listingSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (id && !uuid.safeParse(id).success) return { error: "Invalid listing." }
  const { data: house } = await supabase
    .from("boarding_houses")
    .select("id")
    .eq("id", parsed.data.boarding_house_id)
    .eq("owner_id", user.id)
    .single()
  if (!house) return { error: "Choose one of your own boarding houses." }
  const result = id
    ? await supabase
        .from("listings")
        .update(parsed.data)
        .eq("id", id)
        .eq("boarding_house_id", house.id)
        .in("listing_status", ["draft", "rejected"])
        .select("id")
        .single()
    : await supabase.from("listings").insert(parsed.data).select("id").single()
  if (result.error) return { error: databaseError(result.error) }
  revalidatePath("/owner/listings")
  revalidatePath(`/owner/listings/${result.data.id}`)
  revalidatePath("/owner")
  revalidatePath("/admin/listings")
  return {
    success: "Draft saved. Add a primary photo, then submit for review.",
    redirectTo: `/owner/listings/${result.data.id}`,
  }
}
export async function submitListing(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid listing." }
  const { error } = await supabase.rpc("submit_listing", { target_listing: id })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return { success: "Listing submitted for administrator review." }
}
export async function reviewListing(
  id: string,
  values: unknown
): Promise<ActionResult> {
  const { supabase } = await requireRole("admin")
  const parsed = reviewSchema.safeParse(values)
  if (!uuid.safeParse(id).success) return { error: "Invalid listing." }
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { error } = await supabase.rpc("review_listing", {
    target_listing: id,
    decision: parsed.data.decision,
    review_remarks: parsed.data.remarks,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return {
    success:
      parsed.data.decision === "approved"
        ? "Listing approved and published."
        : "Review saved and sent to the owner.",
    redirectTo: "/admin/verifications",
  }
}
export async function setAccountStatus(
  id: string,
  status: "active" | "suspended"
): Promise<ActionResult> {
  const { supabase } = await requireRole("admin")
  if (!uuid.safeParse(id).success || !["active", "suspended"].includes(status))
    return { error: "Invalid account or status." }
  const { error } = await supabase.rpc("set_account_status", {
    target_user: id,
    new_status: status,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return {
    success: `Account ${status === "active" ? "reactivated" : "suspended"}.`,
  }
}
