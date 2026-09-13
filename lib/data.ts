import "server-only"
import { cache } from "react"
import { notFound } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { uuid } from "@/lib/validation"
import type { Database } from "@/types/database"
import type { ListingDetail, Photo, Role, Row } from "@/types/domain"

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
async function photosWithUrls(
  supabase: Client,
  photos: Row<"listing_photos">[]
): Promise<Photo[]> {
  if (!photos.length) return []
  const { data, error } = await supabase.storage
    .from("listing-photos")
    .createSignedUrls(
      photos.map((p) => p.image_path),
      300
    )
  if (error) throw new Error("Unable to load listing photos. Please try again.")
  return photos.map((photo, i) => ({
    ...photo,
    url: data?.[i]?.signedUrl || null,
  }))
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
  const [rooms, listings, amenities, houseAmenities] = await Promise.all([
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
  ])
  const verifications = listings.length
    ? await rows(
        supabase
          .from("verifications")
          .select("*")
          .in(
            "listing_id",
            listings.map((l) => l.id)
          )
          .order("date_submitted", { ascending: false })
      )
    : []
  return { houses, rooms, listings, amenities, houseAmenities, verifications }
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
  const { data: house } = await supabase
    .from("boarding_houses")
    .select("*")
    .eq("id", listing.boarding_house_id)
    .single()
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
  const [rooms, links, allAmenities, photoRows, verifications] =
    await Promise.all([
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
          .from("listing_photos")
          .select("*")
          .eq("listing_id", id)
          .order("is_primary", { ascending: false })
          .order("created_at")
      ),
      role === "owner" || role === "admin"
        ? rows(
            supabase
              .from("verifications")
              .select("*")
              .eq("listing_id", id)
              .order("date_submitted", { ascending: false })
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
    verifications,
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
            .from("listing_photos")
            .select("*")
            .eq("listing_id", listing.id)
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
      .select("*", { count: "exact", head: true }),
    supabase
      .from("verifications")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("listings")
      .select("*", { count: "exact", head: true })
      .eq("listing_status", "published"),
  ])
  if (counts.some((c) => c.error))
    throw new Error("Unable to load dashboard statistics.")
  const [listings, houses, verifications] = await Promise.all([
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
        .from("verifications")
        .select("*")
        .order("date_submitted", { ascending: false })
    ),
  ])
  return {
    counts: counts.map((c) => c.count || 0),
    listings,
    houses,
    verifications,
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
