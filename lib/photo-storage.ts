export const BOARDING_HOUSE_PHOTO_BUCKET = "boarding-house-photos"
export const LEGACY_LISTING_PHOTO_BUCKET = "listing-photos"
export const ROOM_PHOTO_BUCKET = "room-photos"

export function photoBucketForPath(path: string) {
  return path.startsWith("boarding-houses/")
    ? BOARDING_HOUSE_PHOTO_BUCKET
    : LEGACY_LISTING_PHOTO_BUCKET
}
