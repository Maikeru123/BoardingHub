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
const coordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" ||
        (Number.isFinite(Number(v)) && Number(v) >= min && Number(v) <= max),
      `Enter a number between ${min} and ${max}.`
    )
export const houseSchema = z.object({
  name: z.string().trim().min(1, "Enter a property name.").max(160),
  description,
  street: z.string().trim().max(200),
  barangay: z.string().trim().max(100),
  city: z.string().trim().min(1, "Enter a city.").max(100),
  province: z.string().trim().min(1, "Enter a province.").max(100),
  latitude: coordinate(-90, 90),
  longitude: coordinate(-180, 180),
  contact_number: contact,
  house_rules: description,
  status: z.enum(["active", "inactive"]),
  amenity_ids: z.array(uuid).max(50),
})
export const roomSchema = z.object({
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
  status: z.enum(["available", "maintenance", "inactive"]),
  description,
})
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
export type HouseInput = z.infer<typeof houseSchema>
export type RoomInput = z.infer<typeof roomSchema>
export type ListingInput = z.infer<typeof listingSchema>
