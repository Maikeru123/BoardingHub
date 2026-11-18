import assert from "node:assert/strict"
import { test } from "node:test"
import { getBoardingHouseStatus } from "../lib/boarding-house-status"

const house = {
  id: "house-1",
  status: "active",
  province_code: "1102400000",
  city_municipality_code: "1102401000",
  barangay_code: "1102401001",
  verification_status: "approved",
}
const room = { boarding_house_id: house.id, status: "available" }
const photo = { boarding_house_id: house.id, is_primary: true }
const listing = {
  id: "listing-1",
  boarding_house_id: house.id,
  listing_status: "draft",
}

function status(
  changes: Partial<Parameters<typeof getBoardingHouseStatus>[0]> = {}
) {
  return getBoardingHouseStatus({
    house,
    rooms: [room],
    photos: [photo],
    listings: [listing],
    ...changes,
  })
}

test("property cards require photos and verification before rooms", () => {
  assert.equal(status({ photos: [] }), "add_photos")
  assert.equal(
    status({ house: { ...house, verification_status: "draft" } }),
    "needs_verification"
  )
  assert.equal(
    status({ house: { ...house, verification_status: "pending" } }),
    "awaiting_approval"
  )
  assert.equal(status({ rooms: [] }), "add_room")
  assert.equal(status({ listings: [] }), "create_listing")
})

test("an approved house becomes active after its listing is published", () => {
  assert.equal(
    status({
      listings: [{ ...listing, listing_status: "draft" }],
    }),
    "approved"
  )
  assert.equal(
    status({
      listings: [{ ...listing, listing_status: "published" }],
    }),
    "active"
  )
})

test("review corrections and property restrictions remain visible", () => {
  assert.equal(
    status({
      house: { ...house, verification_status: "for_correction" },
    }),
    "needs_correction"
  )
  assert.equal(status({ house: { ...house, status: "archived" } }), "archived")
  assert.equal(
    status({ house: { ...house, status: "suspended" } }),
    "suspended"
  )
})
