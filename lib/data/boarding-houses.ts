import "server-only"

import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { photoBucketForPath } from "@/lib/photo-storage"
import { getListingDetail, roomPhotosWithUrls } from "@/lib/data"
import { uuid } from "@/lib/validation"
import type {
  BoardingHouseDiscoveryItem,
  DiscoveryAmenity,
  ListingDetail,
  Room,
  RoomAvailability,
  RoomPhoto,
} from "@/types/domain"

export type BoardingHouseFilters = {
  search?: string
  province?: string
  city?: string
  barangay?: string
  minPrice?: string
  maxPrice?: string
  roomType?: string
  amenities?: string[]
  capacity?: string
  available?: string
  sort?: string
  page?: string
}

const PAGE_SIZE = 12

function text(value: string | undefined, max = 100) {
  const clean = value
    ?.replace(/[%_\\]/g, "")
    .trim()
    .slice(0, max)
  return clean || null
}

function code(value: string | undefined) {
  return value && /^\d{10}$/.test(value) ? value : null
}

function number(value: string | undefined, maximum = 9_999_999_999) {
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum
    ? parsed
    : null
}

function amenities(value: unknown): DiscoveryAmenity[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is DiscoveryAmenity =>
    Boolean(
      item &&
      typeof item === "object" &&
      "id" in item &&
      typeof item.id === "string" &&
      "name" in item &&
      typeof item.name === "string"
    )
  )
}

async function signPath(path: string | null) {
  if (!path) return null
  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from(photoBucketForPath(path))
    .createSignedUrl(path, 300)
  if (error) {
    console.error("Discovery photo signing failed", { code: error.name })
    return null
  }
  return data.signedUrl || null
}

export async function getDiscoveryAmenities() {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("amenities")
    .select("*")
    .order("name")
    .abortSignal(AbortSignal.timeout(2500))
  if (error) {
    console.error("Amenity filter query failed", { code: error.code })
    return []
  }
  return data || []
}

export async function getBoardingHouses(filters: BoardingHouseFilters) {
  const currentPage = Math.max(
    1,
    Math.floor(number(filters.page, 100_000) || 1)
  )
  if (!isSupabaseConfigured())
    return {
      items: [],
      total: 0,
      page: currentPage,
      pageSize: PAGE_SIZE,
      configured: false,
      unavailable: false,
    }

  const amenityIds = (filters.amenities || []).filter(
    (id) => uuid.safeParse(id).success
  )
  const roomType = ["single", "shared", "bed_space", "studio"].includes(
    filters.roomType || ""
  )
    ? filters.roomType!
    : null
  const sort = ["newest", "price_low", "price_high", "name"].includes(
    filters.sort || ""
  )
    ? filters.sort!
    : "newest"
  const supabase = await createClient()
  const { data, error } = await supabase
    .rpc("discover_boarding_houses", {
      search_text: text(filters.search),
      province_filter: code(filters.province),
      city_filter: code(filters.city),
      barangay_filter: code(filters.barangay),
      minimum_rent: number(filters.minPrice),
      maximum_rent: number(filters.maxPrice),
      room_type_filter: roomType,
      amenity_filters: amenityIds.length ? amenityIds : null,
      minimum_capacity: number(filters.capacity, 100),
      available_only: filters.available === "true",
      sort_by: sort,
      page_size: PAGE_SIZE,
      page_offset: (currentPage - 1) * PAGE_SIZE,
    })
    .abortSignal(AbortSignal.timeout(2500))
  if (error) {
    console.error("Discovery query failed", { code: error.code })
    return {
      items: [],
      total: 0,
      page: currentPage,
      pageSize: PAGE_SIZE,
      configured: true,
      unavailable: true,
    }
  }
  const items: BoardingHouseDiscoveryItem[] = await Promise.all(
    (data || []).map(async (row) => ({
      ...row,
      amenities: amenities(row.amenities),
      primary_photo_url: await signPath(row.primary_photo_path),
    }))
  )
  return {
    items,
    total: Number(data?.[0]?.total_count || 0),
    page: currentPage,
    pageSize: PAGE_SIZE,
    configured: true,
    unavailable: false,
  }
}

export async function getBoardingHouseDetail(
  id: string
): Promise<ListingDetail> {
  if (!uuid.safeParse(id).success) notFound()
  const supabase = await createClient()
  const { data: listing, error } = await supabase
    .from("listings")
    .select("id")
    .eq("boarding_house_id", id)
    .eq("listing_status", "published")
    .order("date_posted", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw new Error("Unable to load this boarding house.")
  if (!listing) notFound()
  const detail = await getListingDetail(listing.id)
  const { data: owners, error: ownerError } = await supabase.rpc(
    "get_public_owner_profile",
    { target_house: id }
  )
  if (ownerError) throw new Error("Unable to load the property owner.")
  return { ...detail, owner: owners?.[0] || null }
}

export async function getPublicRoomDetail(
  houseId: string,
  roomId: string
): Promise<{
  detail: ListingDetail
  room: Room
  photos: RoomPhoto[]
  availability: RoomAvailability | null
}> {
  if (!uuid.safeParse(roomId).success) notFound()
  const detail = await getBoardingHouseDetail(houseId)
  const room = detail.rooms.find(
    (candidate) => candidate.id === roomId && candidate.status === "available"
  )
  if (!room) notFound()
  const supabase = await createClient()
  const { data: photoRows, error } = await supabase
    .from("room_photos")
    .select("*")
    .eq("room_id", room.id)
    .order("is_primary", { ascending: false })
    .order("created_at")
  if (error) throw new Error("Unable to load room photos.")
  const photos = await roomPhotosWithUrls(supabase, photoRows || [])
  return {
    detail,
    room,
    photos,
    availability:
      detail.roomAvailability?.find((item) => item.room_id === room.id) || null,
  }
}
