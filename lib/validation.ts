import { z } from "zod"
const name = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .max(80, "Use at most 80 characters.")
const contact = z
  .string()
  .trim()
  .refine(
    (v) =>
      !v ||
      (/^\+?[0-9 ()-]{7,25}$/.test(v) && v.replace(/\D/g, "").length >= 7),
    "Enter a valid contact number (7–15 digits)."
  )
  .refine((v) => v.replace(/\D/g, "").length <= 15, "Use at most 15 digits.")
const description = z.string().trim().max(5000, "Use at most 5,000 characters.")
export const uuid = z.string().uuid("Invalid record ID.")
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
})
const password = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(72, "Use at most 72 characters.")
export const registerSchema = z
  .object({
    first_name: name,
    last_name: name,
    email: loginSchema.shape.email,
    contact_number: contact,
    password,
    confirm_password: z.string(),
    role: z.enum(["tenant", "owner"]),
  })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  })
export const forgotSchema = z.object({ email: loginSchema.shape.email })
export const passwordSchema = z
  .object({ password, confirm_password: z.string() })
  .refine((v) => v.password === v.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  })
export const profileSchema = z.object({
  first_name: name,
  last_name: name,
  contact_number: contact,
})
const psgcCode = z
  .string()
  .regex(/^\d{10}$/, "Choose a location from the search results.")
export const houseSchema = z.object({
  name: z.string().trim().min(1, "Enter a property name.").max(160),
  description,
  street: z.string().trim().max(200),
  barangay: z.string().trim().min(1).max(100),
  city_municipality: z.string().trim().min(1).max(100),
  province: z.string().trim().min(1, "Enter a province.").max(100),
  barangay_code: psgcCode,
  city_municipality_code: psgcCode,
  province_code: psgcCode,
  postal_code: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || /^\d{4}$/.test(value),
      "Enter a 4-digit Philippine postal code."
    ),
  contact_number: contact,
  house_rules: description,
  status: z.enum(["active", "archived"]),
  current_month_required: z.boolean(),
  advance_months_required: z.number().int().min(0).max(6),
  amenity_ids: z.array(uuid).max(50),
})
export const roomSchema = z
  .object({
    boarding_house_id: uuid,
    room_number: z.string().trim().max(50),
    room_type: z.enum(["single", "shared", "bed_space", "studio"]),
    monthly_rent: z
      .number({ error: "Enter a valid monthly rent." })
      .positive("Rent must be greater than zero.")
      .max(9999999999.99)
      .refine(
        (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.0001,
        "Use at most two decimal places."
      ),
    capacity: z
      .number({ error: "Enter a valid capacity." })
      .int("Use a whole number.")
      .min(1, "Capacity must be at least 1.")
      .max(100, "Capacity cannot exceed 100."),
    status: z.enum(["available", "maintenance", "archived"]),
    description,
  })
  .transform((room) => ({
    ...room,
    capacity: room.room_type === "single" ? 1 : room.capacity,
  }))
export const listingSchema = z.object({
  boarding_house_id: uuid,
  title: z.string().trim().min(1, "Enter a listing title.").max(160),
  description,
})
export const reviewSchema = z
  .object({
    decision: z.enum(["approved", "rejected", "for_correction"]),
    remarks: z.string().trim().max(3000),
  })
  .refine((v) => v.decision === "approved" || v.remarks.length >= 5, {
    path: ["remarks"],
    message: "Explain what needs to change (at least 5 characters).",
  })
export const inquiryMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Enter a message.")
    .max(4000, "Use at most 4,000 characters."),
})
export const rentalRequestSchema = z
  .object({
    room_id: uuid,
    rental_type: z.enum(["fixed_term", "open_ended"]),
    move_in_date: z.string().date("Choose a move-in date."),
    expected_move_out_date: z.string(),
  })
  .superRefine((value, context) => {
    const today = new Date().toISOString().slice(0, 10)
    if (value.move_in_date < today)
      context.addIssue({
        code: "custom",
        path: ["move_in_date"],
        message: "Move-in date cannot be in the past.",
      })
    if (
      value.rental_type === "fixed_term" &&
      (!value.expected_move_out_date ||
        value.expected_move_out_date <= value.move_in_date)
    )
      context.addIssue({
        code: "custom",
        path: ["expected_move_out_date"],
        message: "Move-out must be after move-in.",
      })
  })
export const rentalRequestDecisionSchema = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    rejection_reason: z
      .string()
      .trim()
      .max(1000, "Use at most 1,000 characters."),
  })
  .refine(
    (value) =>
      value.decision === "approved" || value.rejection_reason.length >= 5,
    {
      path: ["rejection_reason"],
      message: "Explain why the request was rejected (at least 5 characters).",
    }
  )
export const paymentSchema = z
  .object({
    rental_transaction_id: uuid,
    payment_type: z.enum(["initial", "monthly"]),
    amount: z.number().positive().max(9999999999.99),
    payment_method: z.enum(["cash", "gcash"]),
    reference_number: z.string().trim().max(160),
    billing_period_start: z.string(),
    billing_period_end: z.string(),
  })
  .superRefine((value, context) => {
    if (value.payment_method === "gcash" && !value.reference_number)
      context.addIssue({
        code: "custom",
        path: ["reference_number"],
        message: "Enter the GCash reference number.",
      })
    if (
      value.payment_type === "monthly" &&
      (!value.billing_period_start || !value.billing_period_end)
    )
      context.addIssue({
        code: "custom",
        path: ["billing_period_start"],
        message: "The billing period is required.",
      })
  })
export const propertyReviewSchema = z.object({
  rental_transaction_id: uuid,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(3000),
})
export const reportSchema = z.object({
  reason: z.string().trim().min(1).max(160),
  description: z.string().trim().max(3000),
})
export const feedbackSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  message: z.string().trim().min(1).max(4000),
})
export type HouseInput = z.infer<typeof houseSchema>
export type RoomInput = z.infer<typeof roomSchema>
export type ListingInput = z.infer<typeof listingSchema>
