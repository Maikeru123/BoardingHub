import type { Database } from "./database"
export type Role = "tenant" | "owner" | "admin"
export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Profile = Row<"profiles">
export type House = Row<"boarding_houses">
export type Room = Row<"rooms">
export type Listing = Row<"listings">
export type Amenity = Row<"amenities">
export type ListingVerification = Row<"listing_verifications">
export type InquiryThread = Row<"inquiry_threads">
export type InquiryMessage = Row<"inquiry_messages">
export type RentalRequest = Row<"rental_requests">
export type RentalTransaction = Row<"rental_transactions">
export type Payment = Row<"payments">
export type PropertyReview = Row<"reviews">
export type ListingReport = Row<"listing_reports">
export type Feedback = Row<"feedback">
export type Photo = Row<"boarding_house_photos"> & { url: string | null }
export type RoomPhoto = Row<"room_photos"> & { url: string | null }
export type RoomAvailability = {
  room_id: string
  availability_state: "available" | "occupied" | "future_reserved"
  next_reserved_start: string | null
}
export type ActionResult = {
  error?: string
  success?: string
  redirectTo?: string
  entityId?: string
}
export type ListingDetail = {
  listing: Listing
  house: House
  rooms: Room[]
  amenities: Amenity[]
  photos: Photo[]
  roomAvailability?: RoomAvailability[]
  listingVerifications: ListingVerification[]
  owner?: Pick<Profile, "id" | "first_name" | "last_name"> | null
}

export type DiscoveryAmenity = { id: string; name: string }
export type BoardingHouseDiscoveryItem = {
  listing_id: string
  house_id: string
  house_name: string
  house_description: string | null
  barangay: string | null
  city_municipality: string | null
  province: string | null
  postal_code: string | null
  listing_title: string
  listing_description: string | null
  date_posted: string | null
  primary_photo_path: string | null
  primary_photo_url: string | null
  starting_rent: number | null
  available_room_count: number
  room_types: string[]
  amenities: DiscoveryAmenity[]
  total_count: number
}

export type InquirySummary = {
  thread: InquiryThread
  listing: Pick<Listing, "id" | "title" | "boarding_house_id">
  house: Pick<House, "id" | "name">
  photo: Pick<Photo, "image_path" | "url"> | null
  otherParticipant: Pick<Profile, "id" | "first_name" | "last_name"> | null
  latestMessage: InquiryMessage | null
  unreadCount: number
}

export type InquiryDetail = InquirySummary & {
  messages: InquiryMessage[]
}
