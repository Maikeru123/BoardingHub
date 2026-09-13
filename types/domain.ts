import type { Database } from "./database"
export type Role = "tenant" | "owner" | "admin"
export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"]
export type Profile = Row<"profiles">
export type House = Row<"boarding_houses">
export type Room = Row<"rooms">
export type Listing = Row<"listings">
export type Amenity = Row<"amenities">
export type Verification = Row<"verifications">
export type Photo = Row<"listing_photos"> & { url: string | null }
export type ActionResult = {
  error?: string
  success?: string
  redirectTo?: string
}
export type ListingDetail = {
  listing: Listing
  house: House
  rooms: Room[]
  amenities: Amenity[]
  photos: Photo[]
  verifications: Verification[]
}
