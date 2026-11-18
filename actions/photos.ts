"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { databaseError } from "@/lib/action-errors"
import {
  BOARDING_HOUSE_PHOTO_BUCKET,
  photoBucketForPath,
  ROOM_PHOTO_BUCKET,
} from "@/lib/photo-storage"
import { uuid } from "@/lib/validation"
import type { ActionResult } from "@/types/domain"

function imageDetails(file: File, bytes: Uint8Array) {
  if (!file.size || file.size > 5 * 1024 * 1024) return null
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, index) => bytes[index] === byte
  )
  const isWebp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  const extension = isJpeg ? "jpg" : isPng ? "png" : isWebp ? "webp" : null
  return extension
    ? {
        extension,
        contentType: `image/${extension === "jpg" ? "jpeg" : extension}`,
      }
    : null
}

async function uploadObject(houseId: string, form: FormData) {
  const { supabase, user } = await requireRole("owner")
  if (!uuid.safeParse(houseId).success)
    return { error: "Invalid boarding house." } as const
  const file = form.get("photo")
  if (!(file instanceof File))
    return { error: "Choose an image smaller than 5 MB." } as const
  const bytes = new Uint8Array(await file.arrayBuffer())
  const details = imageDetails(file, bytes)
  if (!details)
    return {
      error: "Only valid JPEG, PNG, and WebP images up to 5 MB are supported.",
    } as const
  const path = `boarding-houses/${user.id}/${houseId}/${crypto.randomUUID()}.${details.extension}`
  const { error: uploadError } = await supabase.storage
    .from(BOARDING_HOUSE_PHOTO_BUCKET)
    .upload(path, bytes, {
      contentType: details.contentType,
      upsert: false,
    })
  if (uploadError)
    return {
      error:
        "Image upload failed. Check that you own the boarding house and try again.",
    } as const
  return { supabase, path } as const
}

async function uploadRoomObject(roomId: string, form: FormData) {
  const { supabase, user } = await requireRole("owner")
  if (!uuid.safeParse(roomId).success)
    return { error: "Invalid room." } as const
  const file = form.get("photo")
  if (!(file instanceof File))
    return { error: "Choose an image smaller than 5 MB." } as const
  const bytes = new Uint8Array(await file.arrayBuffer())
  const details = imageDetails(file, bytes)
  if (!details)
    return {
      error: "Only valid JPEG, PNG, and WebP images up to 5 MB are supported.",
    } as const
  const path = `rooms/${user.id}/${roomId}/${crypto.randomUUID()}.${details.extension}`
  const { error: uploadError } = await supabase.storage
    .from(ROOM_PHOTO_BUCKET)
    .upload(path, bytes, {
      contentType: details.contentType,
      upsert: false,
    })
  if (uploadError)
    return {
      error: "Image upload failed. Check that you own the room and try again.",
    } as const
  return { supabase, path } as const
}

export async function uploadHousePhoto(
  houseId: string,
  form: FormData
): Promise<ActionResult> {
  const uploaded = await uploadObject(houseId, form)
  if (uploaded.error) return { error: uploaded.error }
  const { supabase, path } = uploaded
  const { error } = await supabase.rpc("add_boarding_house_photo", {
    target_house: houseId,
    object_path: path,
  })
  if (error) {
    await supabase.storage.from(BOARDING_HOUSE_PHOTO_BUCKET).remove([path])
    return { error: databaseError(error) }
  }
  revalidatePath("/", "layout")
  return { success: "Property photo uploaded." }
}

export async function setPrimaryHousePhoto(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid photo." }
  const { error } = await supabase.rpc("set_primary_boarding_house_photo", {
    target_photo: id,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return { success: "Primary photo updated." }
}

export async function removeHousePhoto(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid photo." }
  const { data: path, error } = await supabase.rpc(
    "remove_boarding_house_photo",
    { target_photo: id }
  )
  if (error) return { error: databaseError(error) }
  const { error: storageError } = await supabase.storage
    .from(photoBucketForPath(path))
    .remove([path])
  revalidatePath("/", "layout")
  if (storageError) {
    console.error("Orphan property image requires storage cleanup", { path })
    return {
      success: "Photo removed from the property. Storage cleanup is pending.",
    }
  }
  return { success: "Photo removed." }
}

export async function replaceHousePhoto(
  houseId: string,
  photoId: string,
  form: FormData
): Promise<ActionResult> {
  if (!uuid.safeParse(photoId).success) return { error: "Invalid photo." }
  const uploaded = await uploadObject(houseId, form)
  if (uploaded.error) return { error: uploaded.error }
  const { supabase, path } = uploaded
  const { data: oldPath, error } = await supabase.rpc(
    "replace_boarding_house_photo",
    { target_photo: photoId, object_path: path }
  )
  if (error) {
    await supabase.storage.from(BOARDING_HOUSE_PHOTO_BUCKET).remove([path])
    return { error: databaseError(error) }
  }
  const { error: storageError } = await supabase.storage
    .from(photoBucketForPath(oldPath))
    .remove([oldPath])
  if (storageError)
    console.error("Replaced property image requires storage cleanup", {
      path: oldPath,
    })
  revalidatePath("/", "layout")
  return { success: "Property photo replaced." }
}

export async function uploadRoomPhoto(
  roomId: string,
  form: FormData
): Promise<ActionResult> {
  const uploaded = await uploadRoomObject(roomId, form)
  if (uploaded.error) return { error: uploaded.error }
  const { supabase, path } = uploaded
  const { error } = await supabase.rpc("add_room_photo", {
    target_room: roomId,
    object_path: path,
  })
  if (error) {
    await supabase.storage.from(ROOM_PHOTO_BUCKET).remove([path])
    return { error: databaseError(error) }
  }
  revalidatePath("/", "layout")
  return { success: "Room photo uploaded." }
}

export async function setPrimaryRoomPhoto(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid photo." }
  const { error } = await supabase.rpc("set_primary_room_photo", {
    target_photo: id,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return { success: "Primary room photo updated." }
}

export async function removeRoomPhoto(id: string): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(id).success) return { error: "Invalid photo." }
  const { data: path, error } = await supabase.rpc("remove_room_photo", {
    target_photo: id,
  })
  if (error) return { error: databaseError(error) }
  const { error: storageError } = await supabase.storage
    .from(ROOM_PHOTO_BUCKET)
    .remove([path])
  revalidatePath("/", "layout")
  if (storageError) {
    console.error("Orphan room image requires storage cleanup", { path })
    return {
      success: "Photo removed from the room. Storage cleanup is pending.",
    }
  }
  return { success: "Room photo removed." }
}

export async function replaceRoomPhoto(
  roomId: string,
  photoId: string,
  form: FormData
): Promise<ActionResult> {
  if (!uuid.safeParse(photoId).success) return { error: "Invalid photo." }
  const uploaded = await uploadRoomObject(roomId, form)
  if (uploaded.error) return { error: uploaded.error }
  const { supabase, path } = uploaded
  const { data: oldPath, error } = await supabase.rpc("replace_room_photo", {
    target_photo: photoId,
    object_path: path,
  })
  if (error) {
    await supabase.storage.from(ROOM_PHOTO_BUCKET).remove([path])
    return { error: databaseError(error) }
  }
  const { error: storageError } = await supabase.storage
    .from(ROOM_PHOTO_BUCKET)
    .remove([oldPath])
  if (storageError)
    console.error("Replaced room image requires storage cleanup", {
      path: oldPath,
    })
  revalidatePath("/", "layout")
  return { success: "Room photo replaced." }
}
