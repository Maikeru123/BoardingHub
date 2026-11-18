import "server-only"

import { cache } from "react"
import { notFound } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { uuid } from "@/lib/validation"
import type {
  Feedback,
  House,
  Listing,
  ListingReport,
  Payment,
  Profile,
  PropertyReview,
  RentalRequest,
  RentalTransaction,
  Role,
  Room,
} from "@/types/domain"

export type RentalRecord = {
  request: RentalRequest
  transaction: RentalTransaction | null
  room: Room
  house: House
  tenant: Pick<Profile, "id" | "first_name" | "last_name"> | null
}

async function mustRows<T>(
  query: PromiseLike<{ data: T[] | null; error: { code?: string } | null }>
) {
  const { data, error } = await query
  if (error) {
    console.error("Rental query failed", { code: error.code })
    throw new Error("Unable to load rental records.")
  }
  return data || []
}

export const getRentalRecords = cache(
  async (role: Role): Promise<RentalRecord[]> => {
    const { supabase } = await requireRole(role)
    await supabase.rpc("sync_rental_statuses")
    const requests = await mustRows(
      supabase
        .from("rental_requests")
        .select("*")
        .order("created_at", { ascending: false })
    )
    if (!requests.length) return []
    const roomIds = [...new Set(requests.map((item) => item.room_id))]
    const tenantIds = [...new Set(requests.map((item) => item.tenant_id))]
    const [transactions, rooms, tenants] = await Promise.all([
      mustRows(
        supabase
          .from("rental_transactions")
          .select("*")
          .in(
            "rental_request_id",
            requests.map((item) => item.id)
          )
      ),
      mustRows(supabase.from("rooms").select("*").in("id", roomIds)),
      mustRows(
        supabase
          .from("profiles")
          .select("id,first_name,last_name")
          .in("id", tenantIds)
      ),
    ])
    const houses = rooms.length
      ? await mustRows(
          supabase
            .from("boarding_houses")
            .select("*")
            .in("id", [...new Set(rooms.map((room) => room.boarding_house_id))])
        )
      : []
    return requests.flatMap((request) => {
      const room = rooms.find((item) => item.id === request.room_id)
      const house =
        room && houses.find((item) => item.id === room.boarding_house_id)
      if (!room || !house) return []
      return [
        {
          request,
          transaction:
            transactions.find(
              (item) => item.rental_request_id === request.id
            ) || null,
          room,
          house,
          tenant: tenants.find((item) => item.id === request.tenant_id) || null,
        },
      ]
    })
  }
)

export async function getRentalRecord(id: string, role: "tenant" | "owner") {
  if (!uuid.safeParse(id).success) notFound()
  const records = await getRentalRecords(role)
  const record = records.find((item) => item.transaction?.id === id)
  if (!record) notFound()
  return record
}

export const getPayments = cache(async (role: Role) => {
  const { supabase } = await requireRole(role)
  const payments = await mustRows(
    supabase
      .from("payments")
      .select("*")
      .order("payment_date", { ascending: false })
  )
  const proofUrls = new Map<string, string>()
  await Promise.all(
    payments.map(async (payment) => {
      if (!payment.proof_image_path) return
      const { data } = await supabase.storage
        .from("payment-proofs")
        .createSignedUrl(payment.proof_image_path, 300)
      if (data?.signedUrl) proofUrls.set(payment.id, data.signedUrl)
    })
  )
  return { payments, proofUrls }
})

export async function getPaymentsForRental(
  rentalId: string,
  role: "tenant" | "owner"
) {
  const { payments, proofUrls } = await getPayments(role)
  return {
    payments: payments.filter(
      (item) => item.rental_transaction_id === rentalId
    ),
    proofUrls,
  }
}

export async function getReviewForRental(rentalId: string) {
  if (!uuid.safeParse(rentalId).success) return null
  const { supabase } = await requireRole("tenant")
  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("rental_transaction_id", rentalId)
    .maybeSingle()
  return data
}

export async function getPublicReviews(houseId: string) {
  if (!uuid.safeParse(houseId).success)
    return { reviews: [] as PropertyReview[], average: 0 }
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("boarding_house_id", houseId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
  if (error) return { reviews: [] as PropertyReview[], average: 0 }
  const reviews = data || []
  return {
    reviews,
    average: reviews.length
      ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
      : 0,
  }
}

export const getAdminPhaseThree = cache(async () => {
  const { supabase } = await requireRole("admin")
  await supabase.rpc("sync_rental_statuses")
  const [
    requests,
    transactions,
    payments,
    reviews,
    listingReports,
    feedback,
    listings,
  ] = await Promise.all([
    mustRows(
      supabase
        .from("rental_requests")
        .select("*")
        .order("created_at", { ascending: false })
    ),
    mustRows(
      supabase
        .from("rental_transactions")
        .select("*")
        .order("created_at", { ascending: false })
    ),
    mustRows(
      supabase
        .from("payments")
        .select("*")
        .order("payment_date", { ascending: false })
    ),
    mustRows(
      supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false })
    ),
    mustRows(
      supabase
        .from("listing_reports")
        .select("*")
        .order("date_reported", { ascending: false })
    ),
    mustRows(
      supabase
        .from("feedback")
        .select("*")
        .order("date_submitted", { ascending: false })
    ),
    mustRows(
      supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false })
    ),
  ])
  return {
    requests,
    transactions,
    payments,
    reviews,
    listingReports,
    feedback,
    listings,
  }
})

export type { Feedback, Listing, ListingReport, Payment }
