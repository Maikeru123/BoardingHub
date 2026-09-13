"use server"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { databaseError } from "@/lib/action-errors"
import { uuid } from "@/lib/validation"
import type { ActionResult } from "@/types/domain"

export async function uploadPhoto(
  listingId: string,
  form: FormData
): Promise<ActionResult> {
  const { supabase, user } = await requireRole("owner")
  if (!uuid.safeParse(listingId).success) return { error: "Invalid listing." }
  const file = form.get("photo")
  if (!(file instanceof File) || !file.size || file.size > 5 * 1024 * 1024)
    return { error: "Choose an image smaller than 5 MB." }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (b, i) => bytes[i] === b
  )
  const isWebp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  const ext = isJpeg ? "jpg" : isPng ? "png" : isWebp ? "webp" : null
  if (!ext) return { error: "Only JPEG, PNG, and WebP images are supported." }
  const path = `${user.id}/${listingId}/${crypto.randomUUID()}.${ext}`
  // Storage RLS independently verifies ownership and that the listing is editable.
  const { error: uploadError } = await supabase.storage
    .from("listing-photos")
    .upload(path, bytes, {
      contentType: `image/${ext === "jpg" ? "jpeg" : ext}`,
      upsert: false,
    })
  if (uploadError)
    return {
      error:
        "Image upload failed. Check that the listing is editable and try again.",
    }
  const { error } = await supabase.rpc("add_listing_photo", {
    target_listing: listingId,
    object_path: path,
  })
  if (error) {
    await supabase.storage.from("listing-photos").remove([path])
    return { error: databaseError(error) }
  }
  revalidatePath("/", "layout")
  return { success: "Photo uploaded." }
}
export async function setPrimaryPhoto(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid photo." }
  const { error } = await supabase.rpc("set_primary_photo", {
    target_photo: id,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return { success: "Primary photo updated." }
}
export async function removePhoto(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid photo." }
  const { data: path, error } = await supabase.rpc("remove_listing_photo", {
    target_photo: id,
  })
  if (error) return { error: databaseError(error) }
  const { error: storageError } = await supabase.storage
    .from("listing-photos")
    .remove([path])
  revalidatePath("/", "layout")
  if (storageError) {
    console.error("Orphan listing image requires storage cleanup", { path })
    return {
      success: "Photo removed from the listing. Storage cleanup is pending.",
    }
  }
  return { success: "Photo removed." }
}
