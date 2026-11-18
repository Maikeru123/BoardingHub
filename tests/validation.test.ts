import assert from "node:assert/strict"
import { test } from "node:test"
import {
  houseSchema,
  registerSchema,
  roomSchema,
  reviewSchema,
  passwordSchema,
  inquiryMessageSchema,
  paymentSchema,
  rentalRequestDecisionSchema,
} from "../lib/validation"
import {
  addCalendarMonths,
  calculateInitialPayment,
  getBillingSummary,
} from "../lib/rental-payment"
import type { Payment, RentalTransaction } from "../types/domain"
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
test("inquiry messages reject empty and oversized content", () => {
  assert.equal(
    inquiryMessageSchema.safeParse({ message: "   " }).success,
    false
  )
  assert.equal(
    inquiryMessageSchema.safeParse({ message: "x".repeat(4001) }).success,
    false
  )
  assert.equal(
    inquiryMessageSchema.safeParse({ message: "Is this room available?" })
      .success,
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
  assert.equal(
    roomSchema.parse({ ...room, capacity: 8 }).capacity,
    1,
    "single room capacity is normalized on the server"
  )
  for (const changes of [
    { monthly_rent: -1 },
    { monthly_rent: 1.001 },
    { monthly_rent: NaN },
    { capacity: 0 },
    { capacity: 1.5 },
    { capacity: 101 },
    { status: "booked" },
    { status: "inactive" },
  ])
    assert.equal(roomSchema.safeParse({ ...room, ...changes }).success, false)
})
test("PSGC locations, postal codes, and review remarks are validated", () => {
  const house = {
    name: "Blue House",
    description: "",
    street: "",
    barangay: "Lahug",
    city_municipality: "City of Cebu",
    province: "Cebu",
    barangay_code: "0730600041",
    city_municipality_code: "0730600000",
    province_code: "0702200000",
    postal_code: "6000",
    contact_number: "",
    house_rules: "",
    status: "active",
    amenity_ids: [],
    current_month_required: true,
    advance_months_required: 0,
  }
  assert.equal(houseSchema.safeParse(house).success, true)
  assert.equal(
    houseSchema.safeParse({ ...house, barangay_code: "invalid" }).success,
    false
  )
  assert.equal(
    houseSchema.safeParse({ ...house, postal_code: "60" }).success,
    false
  )
  assert.equal(
    houseSchema.safeParse({ ...house, current_month_required: 1 }).success,
    false
  )
  assert.equal(
    houseSchema.safeParse({ ...house, advance_months_required: 7 }).success,
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
test("initial payments include only enabled current-month and advance terms", () => {
  assert.equal(calculateInitialPayment(4000, true, 2), 12000)
  assert.equal(calculateInitialPayment(4000, false, 2), 8000)
})
test("billing cycles use calendar anniversaries and respect prepaid months", () => {
  assert.equal(addCalendarMonths("2026-01-31", 1), "2026-02-28")
  assert.equal(addCalendarMonths("2026-01-31", 2), "2026-03-31")
  const rental = {
    id: "10000000-0000-4000-8000-000000000010",
    start_date: "2026-10-05",
    current_month_required: true,
    advance_months_required: 2,
    initial_payment_amount: 12000,
    monthly_rent: 4000,
  } as RentalTransaction
  const initial = {
    id: "10000000-0000-4000-8000-000000000011",
    rental_transaction_id: rental.id,
    payment_type: "initial",
    payment_status: "paid",
    payment_date: "2026-10-01T00:00:00.000Z",
  } as Payment
  const summary = getBillingSummary(rental, [initial], "2026-10-10")
  assert.equal(summary.nextPaymentDue, "2027-01-05")
  assert.equal(summary.billingPeriodEnd, "2027-02-04")
  assert.equal(summary.amountDue, 4000)
})
test("payment validation supports Cash and requires a GCash reference", () => {
  const payment = {
    rental_transaction_id: "10000000-0000-4000-8000-000000000010",
    payment_type: "monthly",
    amount: 4000,
    payment_method: "cash",
    reference_number: "",
    billing_period_start: "2026-10-05",
    billing_period_end: "2026-11-04",
  }
  assert.equal(paymentSchema.safeParse(payment).success, true)
  assert.equal(
    paymentSchema.safeParse({
      ...payment,
      payment_method: "gcash",
    }).success,
    false
  )
  assert.equal(
    paymentSchema.safeParse({
      ...payment,
      payment_method: "gcash",
      reference_number: "123456789",
    }).success,
    true
  )
  assert.equal(
    paymentSchema.safeParse({
      ...payment,
      payment_method: "bank_transfer",
    }).success,
    false
  )
})
test("rental request rejection requires actionable feedback", () => {
  assert.equal(
    rentalRequestDecisionSchema.safeParse({
      decision: "approved",
      rejection_reason: "",
    }).success,
    true
  )
  assert.equal(
    rentalRequestDecisionSchema.safeParse({
      decision: "rejected",
      rejection_reason: "No",
    }).success,
    false
  )
  assert.equal(
    rentalRequestDecisionSchema.safeParse({
      decision: "rejected",
      rejection_reason: "The room is unavailable for the selected dates.",
    }).success,
    true
  )
})
