import "server-only"
import { cache } from "react"
import { notFound } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { uuid } from "@/lib/validation"
import { photoBucketForPath, ROOM_PHOTO_BUCKET } from "@/lib/photo-storage"
import type { Database } from "@/types/supabase"
import type {
  ListingDetail,
  Photo,
  Role,
  RoomAvailability,
  RoomPhoto,
  Row,
} from "@/types/domain"

type Client = SupabaseClient<Database>
async function rows<T>(
  query: PromiseLike<{
    data: T[] | null
    error: { message: string; code?: string } | null
  }>
): Promise<T[]> {
  const { data, error } = await query
  if (error) {
    console.error("Data query failed", { code: error.code })
    throw new Error("Unable to load records. Please try again.")
  }
  return data || []
}
export async function photosWithUrls(
  supabase: Client,
  photos: Row<"boarding_house_photos">[]
): Promise<Photo[]> {
  if (!photos.length) return []
  const signed = await Promise.all(
    photos.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from(photoBucketForPath(photo.image_path))
        .createSignedUrl(photo.image_path, 300)
      if (error)
        throw new Error("Unable to load property photos. Please try again.")
      return { ...photo, url: data.signedUrl || null }
    })
  )
  return signed
}

export async function roomPhotosWithUrls(
  supabase: Client,
  photos: Row<"room_photos">[]
): Promise<RoomPhoto[]> {
  return Promise.all(
    photos.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from(ROOM_PHOTO_BUCKET)
        .createSignedUrl(photo.image_path, 300)
      if (error)
        throw new Error("Unable to load room photos. Please try again.")
      return { ...photo, url: data.signedUrl || null }
    })
  )
}

export const getOwnerData = cache(async () => {
  const { supabase, user } = await requireRole("owner")
  const houses = await rows(
    supabase
      .from("boarding_houses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
  )
  const ids = houses.map((h) => h.id)
  const [rooms, listings, amenities, houseAmenities, photoRows, roomPhotoRows] =
    await Promise.all([
      ids.length
        ? rows(
            supabase
              .from("rooms")
              .select("*")
              .in("boarding_house_id", ids)
              .order("created_at", { ascending: false })
          )
        : [],
      ids.length
        ? rows(
            supabase
              .from("listings")
              .select("*")
              .in("boarding_house_id", ids)
              .order("created_at", { ascending: false })
          )
        : [],
      rows(supabase.from("amenities").select("*").order("name")),
      ids.length
        ? rows(
            supabase
              .from("boarding_house_amenities")
              .select("*")
              .in("boarding_house_id", ids)
          )
        : [],
      ids.length
        ? rows(
            supabase
              .from("boarding_house_photos")
              .select("*")
              .in("boarding_house_id", ids)
              .order("is_primary", { ascending: false })
              .order("created_at")
          )
        : [],
      ids.length
        ? rows(
            supabase
              .from("room_photos")
              .select("*")
              .order("is_primary", { ascending: false })
              .order("created_at")
          )
        : [],
    ])
  const [photos, roomPhotos] = await Promise.all([
    photosWithUrls(supabase, photoRows),
    roomPhotosWithUrls(supabase, roomPhotoRows),
  ])
  const listingVerifications = listings.length
    ? await rows(
        supabase
          .from("listing_verifications")
          .select("*")
          .in(
            "listing_id",
            listings.map((l) => l.id)
          )
          .order("date_submitted", { ascending: false })
      )
    : []
  return {
    houses,
    rooms,
    listings,
    amenities,
    houseAmenities,
    listingVerifications,
    photos,
    roomPhotos,
  }
})

export async function getListingDetail(
  id: string,
  role?: Role
): Promise<ListingDetail> {
  if (!uuid.safeParse(id).success) notFound()
  const supabase = role
    ? (await requireRole(role)).supabase
    : await createClient()
  let query = supabase.from("listings").select("*").eq("id", id)
  if (!role || role === "tenant")
    query = query.eq("listing_status", "published")
  const { data: listing, error } = await query.maybeSingle()
  if (error) throw new Error("Unable to load the listing.")
  if (!listing) notFound()
  const { data: house, error: houseError } = await supabase
    .from("boarding_houses")
    .select("*")
    .eq("id", listing.boarding_house_id)
    .single()
  if (houseError) throw new Error("Unable to load the boarding house.")
  if (!house || (!role && house.status !== "active")) notFound()
  // RLS is the final boundary; explicit owner checks also protect this server data path.
  if (role === "owner") {
    const { user } = await requireRole("owner")
    if (house.owner_id !== user.id) notFound()
  }
  let roomQuery = supabase
    .from("rooms")
    .select("*")
    .eq("boarding_house_id", house.id)
    .order("monthly_rent")
  if (!role || role === "tenant")
    roomQuery = roomQuery.eq("status", "available")
  const [
    rooms,
    links,
    allAmenities,
    photoRows,
    listingVerifications,
    roomStates,
  ] = await Promise.all([
    rows(roomQuery),
    rows(
      supabase
        .from("boarding_house_amenities")
        .select("*")
        .eq("boarding_house_id", house.id)
    ),
    rows(supabase.from("amenities").select("*").order("name")),
    rows(
      supabase
        .from("boarding_house_photos")
        .select("*")
        .eq("boarding_house_id", house.id)
        .order("is_primary", { ascending: false })
        .order("created_at")
    ),
    role === "owner" || role === "admin"
      ? rows(
          supabase
            .from("listing_verifications")
            .select("*")
            .eq("listing_id", id)
            .order("date_submitted", { ascending: false })
        )
      : [],
    !role || role === "tenant"
      ? rows(
          supabase.rpc("get_public_room_states", {
            target_house: house.id,
          })
        )
      : [],
  ])
  const photos = await photosWithUrls(supabase, photoRows)
  return {
    listing,
    house,
    rooms,
    amenities: allAmenities.filter((a) =>
      links.some((l) => l.amenity_id === a.id)
    ),
    photos,
    roomAvailability: roomStates as RoomAvailability[],
    listingVerifications,
  }
}

export async function getPublicListings(search = "", page = 1) {
  if (!isSupabaseConfigured())
    return { listings: [], total: 0, configured: false }
  const supabase = await createClient()
  const clean = search
    .replace(/[%_\\]/g, "")
    .trim()
    .slice(0, 100)
  let query = supabase
    .from("listings")
    .select("*", { count: "exact" })
    .eq("listing_status", "published")
  if (clean) query = query.ilike("title", `%${clean}%`)
  const current = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1)
  const { data, count, error } = await query
    .order("date_posted", { ascending: false })
    .range((current - 1) * 12, current * 12 - 1)
  if (error) throw new Error("Unable to load available boarding houses.")
  const listings = await Promise.all(
    (data || []).map(async (listing) => {
      const [houses, rooms, photos] = await Promise.all([
        rows(
          supabase
            .from("boarding_houses")
            .select("*")
            .eq("id", listing.boarding_house_id)
            .eq("status", "active")
        ),
        rows(
          supabase
            .from("rooms")
            .select("*")
            .eq("boarding_house_id", listing.boarding_house_id)
            .eq("status", "available")
            .order("monthly_rent")
        ),
        rows(
          supabase
            .from("boarding_house_photos")
            .select("*")
            .eq("boarding_house_id", listing.boarding_house_id)
            .eq("is_primary", true)
        ),
      ])
      const signed = await photosWithUrls(supabase, photos)
      return { listing, house: houses[0], rooms, photo: signed[0] }
    })
  )
  return {
    listings: listings.filter((l) => l.house),
    total: count || 0,
    configured: true,
  }
}

export const getAdminData = cache(async () => {
  const { supabase } = await requireRole("admin")
  const counts = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "owner"),
    supabase
      .from("boarding_houses")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("boarding_houses")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("verification_status", "pending"),
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("listing_status", "published"),
  ])
  if (counts.some((c) => c.error))
    throw new Error("Unable to load dashboard statistics.")
  const [listings, houses, rooms, listingVerifications, photoRows] =
    await Promise.all([
      rows(
        supabase
          .from("listings")
          .select("*")
          .order("created_at", { ascending: false })
      ),
      rows(
        supabase
          .from("boarding_houses")
          .select("*")
          .order("created_at", { ascending: false })
      ),
      rows(
        supabase
          .from("rooms")
          .select("*")
          .order("created_at", { ascending: false })
      ),
      rows(
        supabase
          .from("listing_verifications")
          .select("*")
          .order("date_submitted", { ascending: false })
      ),
      rows(
        supabase
          .from("boarding_house_photos")
          .select("*")
          .order("is_primary", { ascending: false })
          .order("created_at")
      ),
    ])
  const photos = await photosWithUrls(supabase, photoRows)
  const dashboardCounts = counts.map((count) => count.count || 0)
  const activeApprovedHouseIds = new Set(
    houses
      .filter(
        (house) =>
          house.status === "active" && house.verification_status === "approved"
      )
      .map((house) => house.id)
  )
  dashboardCounts[4] = listings.filter(
    (listing) =>
      listing.listing_status === "published" &&
      activeApprovedHouseIds.has(listing.boarding_house_id)
  ).length
  return {
    counts: dashboardCounts,
    listings,
    houses,
    rooms,
    listingVerifications,
    photos,
  }
})
export async function getAccounts(page = 1) {
  const { supabase } = await requireRole("admin")
  const current = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1)
  const { data, error, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((current - 1) * 25, current * 25 - 1)
  if (error) throw new Error("Unable to load accounts.")
  return { accounts: data || [], total: count || 0 }
}
