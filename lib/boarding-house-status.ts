import type { House, Listing, Photo, Room } from "@/types/domain"

export type BoardingHouseStatus =
  | "active"
  | "approved"
  | "archived"
  | "suspended"
  | "complete_address"
  | "add_room"
  | "add_photos"
  | "create_listing"
  | "needs_verification"
  | "awaiting_approval"
  | "needs_correction"

type StatusInput = {
  house: Pick<
    House,
    | "id"
    | "status"
    | "verification_status"
    | "province_code"
    | "city_municipality_code"
    | "barangay_code"
  >
  rooms: Pick<Room, "boarding_house_id" | "status">[]
  photos: Pick<Photo, "boarding_house_id" | "is_primary">[]
  listings: Pick<Listing, "id" | "boarding_house_id" | "listing_status">[]
}

export function getBoardingHouseStatus({
  house,
  rooms,
  photos,
  listings,
}: StatusInput): BoardingHouseStatus {
  if (house.status === "suspended") return "suspended"
  if (house.status !== "active") return "archived"

  if (
    !house.province_code ||
    !house.city_municipality_code ||
    !house.barangay_code
  )
    return "complete_address"

  if (
    !photos.some(
      (photo) => photo.boarding_house_id === house.id && photo.is_primary
    )
  )
    return "add_photos"

  if (house.verification_status === "pending") return "awaiting_approval"
  if (
    house.verification_status === "rejected" ||
    house.verification_status === "for_correction"
  )
    return "needs_correction"
  if (house.verification_status !== "approved") return "needs_verification"

  if (
    !rooms.some(
      (room) =>
        room.boarding_house_id === house.id && room.status !== "archived"
    )
  )
    return "add_room"

  const houseListings = listings.filter(
    (listing) => listing.boarding_house_id === house.id
  )
  if (!houseListings.length) return "create_listing"
  if (houseListings.some((listing) => listing.listing_status === "published"))
    return "active"
  if (houseListings.some((listing) => listing.listing_status === "suspended"))
    return "suspended"
  return "approved"
}
