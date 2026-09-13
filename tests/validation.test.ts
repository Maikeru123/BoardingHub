import assert from "node:assert/strict"
import { test } from "node:test"
import {
  houseSchema,
  registerSchema,
  roomSchema,
  reviewSchema,
  passwordSchema,
} from "../lib/validation"
const registration = {
  first_name: "Ana",
  last_name: "Cruz",
  email: "ana@example.com",
  password: "strong-pass",
  confirm_password: "strong-pass",
  contact_number: "+63 917 123 4567",
  role: "tenant",
}
test("registration rejects admin roles, bad contact information, and mismatched passwords", () => {
  assert.equal(registerSchema.safeParse(registration).success, true)
  for (const changes of [
    { role: "admin" },
    { contact_number: "call me" },
    { email: "invalid" },
    { first_name: " " },
    { confirm_password: "different" },
    { password: "short", confirm_password: "short" },
  ])
    assert.equal(
      registerSchema.safeParse({ ...registration, ...changes }).success,
      false
    )
  assert.equal(
    passwordSchema.safeParse({
      password: "strong-pass",
      confirm_password: "strong-pass",
    }).success,
    true
  )
})
test("room validation rejects invalid price, capacity, and unsupported availability states", () => {
  const room = {
    boarding_house_id: "10000000-0000-4000-8000-000000000001",
    room_number: "101",
    room_type: "single",
    monthly_rent: 3500.25,
    capacity: 1,
    status: "available",
    description: "",
  }
  assert.equal(roomSchema.safeParse(room).success, true)
  for (const changes of [
    { monthly_rent: -1 },
    { monthly_rent: 1.001 },
    { monthly_rent: NaN },
    { capacity: 0 },
    { capacity: 1.5 },
    { capacity: 101 },
    { status: "booked" },
  ])
    assert.equal(roomSchema.safeParse({ ...room, ...changes }).success, false)
})
test("location coordinates and review remarks are validated", () => {
  const house = {
    name: "Blue House",
    description: "",
    street: "",
    barangay: "",
    city: "Cebu",
    province: "Cebu",
    latitude: "",
    longitude: "",
    contact_number: "",
    house_rules: "",
    status: "active",
    amenity_ids: [],
  }
  assert.equal(houseSchema.safeParse(house).success, true)
  assert.equal(
    houseSchema.safeParse({ ...house, latitude: "91" }).success,
    false
  )
  assert.equal(
    houseSchema.safeParse({ ...house, longitude: "no" }).success,
    false
  )
  assert.equal(
    reviewSchema.safeParse({ decision: "approved", remarks: "" }).success,
    true
  )
  assert.equal(
    reviewSchema.safeParse({ decision: "for_correction", remarks: "" }).success,
    false
  )
  assert.equal(
    reviewSchema.safeParse({
      decision: "rejected",
      remarks: "Please provide accurate photos.",
    }).success,
    true
  )
})
