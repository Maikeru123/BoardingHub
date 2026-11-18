"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { databaseError } from "@/lib/action-errors"
import {
  feedbackSchema,
  paymentSchema,
  propertyReviewSchema,
  rentalRequestDecisionSchema,
  rentalRequestSchema,
  reportSchema,
  uuid,
} from "@/lib/validation"
import type { ActionResult } from "@/types/domain"

function refreshRentals() {
  revalidatePath("/", "layout")
}

function paymentProofDetails(bytes: Uint8Array) {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const isPng = [137, 80, 78, 71, 13, 10, 26, 10].every(
    (byte, index) => bytes[index] === byte
  )
  const isWebp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  if (isJpeg) return { extension: "jpg", contentType: "image/jpeg" }
  if (isPng) return { extension: "png", contentType: "image/png" }
  if (isWebp) return { extension: "webp", contentType: "image/webp" }
  return null
}

export async function requestRental(values: unknown): Promise<ActionResult> {
  const traceId = crypto.randomUUID()
  console.info(`[rental-request:${traceId}] Received submission.`)

  const { supabase } = await requireRole("tenant")
  const parsed = rentalRequestSchema.safeParse(values)
  if (!parsed.success) {
    console.warn(`[rental-request:${traceId}] Validation failed.`, {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    })
    return { error: parsed.error.issues[0].message }
  }

  console.info(`[rental-request:${traceId}] Validation passed.`, {
    roomId: parsed.data.room_id,
    rentalType: parsed.data.rental_type,
    moveInDate: parsed.data.move_in_date,
    expectedMoveOutDate:
      parsed.data.rental_type === "fixed_term"
        ? parsed.data.expected_move_out_date
        : null,
  })

  const { data, error } = await supabase.rpc("submit_rental_request", {
    target_room: parsed.data.room_id,
    requested_type: parsed.data.rental_type,
    requested_start: parsed.data.move_in_date,
    requested_end:
      parsed.data.rental_type === "fixed_term"
        ? parsed.data.expected_move_out_date
        : null,
  })
  if (error) {
    console.error(`[rental-request:${traceId}] Database request failed.`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return { error: databaseError(error) }
  }

  console.info(`[rental-request:${traceId}] Rental request created.`, {
    requestId: data,
  })
  refreshRentals()
  return {
    success: "Rental request sent to the property owner.",
    redirectTo: "/tenant/rentals",
    entityId: data,
  }
}

export async function decideRentalRequest(
  requestId: string,
  decision: "approved" | "rejected",
  rejectionReason = ""
): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(requestId).success) return { error: "Invalid request." }
  const parsed = rentalRequestDecisionSchema.safeParse({
    decision,
    rejection_reason: rejectionReason,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { error } = await supabase.rpc("decide_rental_request", {
    target_request: requestId,
    decision: parsed.data.decision,
    rejection_reason:
      parsed.data.decision === "rejected" ? parsed.data.rejection_reason : null,
  })
  if (error) return { error: databaseError(error) }
  refreshRentals()
  return {
    success:
      decision === "approved"
        ? "Rental approved. Waiting for the tenant's payment."
        : "Rental request rejected.",
  }
}

export async function cancelRentalRequest(
  requestId: string
): Promise<ActionResult> {
  const { supabase } = await requireRole("tenant")
  if (!uuid.safeParse(requestId).success) return { error: "Invalid request." }
  const { error } = await supabase.rpc("cancel_rental_request", {
    target_request: requestId,
  })
  if (error) return { error: databaseError(error) }
  refreshRentals()
  return { success: "Rental request cancelled." }
}

export async function submitPayment(formData: FormData): Promise<ActionResult> {
  const traceId = crypto.randomUUID()
  console.info(`[rental-payment:${traceId}] Received submission.`)

  const { supabase, user } = await requireRole("tenant")
  const raw = {
    rental_transaction_id: String(formData.get("rental_transaction_id") || ""),
    payment_type: String(formData.get("payment_type") || ""),
    amount: Number(formData.get("amount")),
    payment_method: String(formData.get("payment_method") || ""),
    reference_number: String(formData.get("reference_number") || ""),
    billing_period_start: String(formData.get("billing_period_start") || ""),
    billing_period_end: String(formData.get("billing_period_end") || ""),
  }
  const parsed = paymentSchema.safeParse(raw)
  if (!parsed.success) {
    console.warn(`[rental-payment:${traceId}] Validation failed.`, {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    })
    return { error: parsed.error.issues[0].message }
  }

  console.info(`[rental-payment:${traceId}] Validation passed.`, {
    rentalId: parsed.data.rental_transaction_id,
    paymentType: parsed.data.payment_type,
    paymentMethod: parsed.data.payment_method,
    amount: parsed.data.amount,
    billingPeriodStart: parsed.data.billing_period_start || null,
    billingPeriodEnd: parsed.data.billing_period_end || null,
  })

  const file = formData.get("proof")
  let proofPath: string | null = null
  if (parsed.data.payment_method === "gcash") {
    if (!(file instanceof File) || file.size === 0)
      return { error: "Upload the GCash proof of payment image." }
    if (file.size > 5 * 1024 * 1024)
      return { error: "Payment proof must be 5 MB or smaller." }
    const bytes = new Uint8Array(await file.arrayBuffer())
    const details = paymentProofDetails(bytes)
    if (!details)
      return { error: "Upload a valid JPG, PNG, or WebP proof image." }
    const billingSegment =
      parsed.data.payment_type === "initial"
        ? "initial"
        : parsed.data.billing_period_start
    proofPath = `${user.id}/${parsed.data.rental_transaction_id}/${billingSegment}/${crypto.randomUUID()}.${details.extension}`
    const upload = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, bytes, {
        contentType: details.contentType,
        upsert: false,
      })
    if (upload.error) {
      console.error(`[rental-payment:${traceId}] Proof upload failed.`, {
        message: upload.error.message,
      })
      return { error: databaseError(upload.error) }
    }
  }
  const { data, error } = await supabase.rpc("submit_payment", {
    target_rental: parsed.data.rental_transaction_id,
    kind: parsed.data.payment_type,
    amount_paid: parsed.data.amount,
    method: parsed.data.payment_method,
    reference: parsed.data.reference_number || null,
    proof_path: proofPath,
    period_start:
      parsed.data.payment_type === "monthly"
        ? parsed.data.billing_period_start || null
        : null,
    period_end:
      parsed.data.payment_type === "monthly"
        ? parsed.data.billing_period_end || null
        : null,
  })
  if (error) {
    if (proofPath)
      await supabase.storage.from("payment-proofs").remove([proofPath])
    console.error(`[rental-payment:${traceId}] Database request failed.`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return { error: databaseError(error) }
  }

  console.info(`[rental-payment:${traceId}] Payment created.`, {
    paymentId: data,
  })
  refreshRentals()
  return { success: "Payment submitted for owner confirmation." }
}

export async function reviewPayment(
  paymentId: string,
  decision: "paid" | "rejected",
  remarks = ""
): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(paymentId).success) return { error: "Invalid payment." }
  const { error } = await supabase.rpc("review_payment", {
    target_payment: paymentId,
    decision,
    owner_remarks: remarks || null,
  })
  if (error) return { error: databaseError(error) }
  refreshRentals()
  return {
    success: decision === "paid" ? "Payment confirmed." : "Payment rejected.",
  }
}

export async function setRentalEnd(
  rentalId: string,
  expectedEnd: string | null,
  actualEnd: string | null
): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(rentalId).success) return { error: "Invalid rental." }
  const { error } = await supabase.rpc("set_rental_end", {
    target_rental: rentalId,
    expected_end: expectedEnd,
    actual_end: actualEnd,
  })
  if (error) return { error: databaseError(error) }
  refreshRentals()
  return {
    success: actualEnd
      ? "Move-out recorded and rental completed."
      : "Expected move-out recorded.",
  }
}

export async function cancelRentalTransaction(
  rentalId: string
): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(rentalId).success) return { error: "Invalid rental." }
  const { error } = await supabase.rpc("cancel_rental_transaction", {
    target_rental: rentalId,
  })
  if (error) return { error: databaseError(error) }
  refreshRentals()
  return { success: "Rental cancelled." }
}

export async function cancelTenantRental(
  rentalId: string
): Promise<ActionResult> {
  const { supabase } = await requireRole("tenant")
  if (!uuid.safeParse(rentalId).success) return { error: "Invalid rental." }
  const { error } = await supabase.rpc("cancel_rental_transaction", {
    target_rental: rentalId,
  })
  if (error) return { error: databaseError(error) }
  refreshRentals()
  return { success: "Rental request cancelled." }
}

export async function submitPropertyReview(
  values: unknown
): Promise<ActionResult> {
  const { supabase } = await requireRole("tenant")
  const parsed = propertyReviewSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { error } = await supabase.rpc("submit_review", {
    target_rental: parsed.data.rental_transaction_id,
    review_rating: parsed.data.rating,
    review_comment: parsed.data.comment || null,
  })
  if (error) return { error: databaseError(error) }
  refreshRentals()
  return { success: "Thank you for reviewing your stay." }
}

export async function reportListing(
  listingId: string,
  values: unknown
): Promise<ActionResult> {
  const { supabase } = await requireRole()
  if (!uuid.safeParse(listingId).success) return { error: "Invalid listing." }
  const parsed = reportSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { error } = await supabase.rpc("submit_listing_report", {
    target_listing: listingId,
    report_reason: parsed.data.reason,
    report_description: parsed.data.description || null,
  })
  if (error) return { error: databaseError(error) }
  return { success: "Report submitted for administrator review." }
}

export async function sendFeedback(values: unknown): Promise<ActionResult> {
  const { supabase } = await requireRole()
  const parsed = feedbackSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { error } = await supabase.rpc("submit_feedback", {
    feedback_subject: parsed.data.subject,
    feedback_message: parsed.data.message,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/admin/feedback")
  return { success: "Feedback sent to BoardingHub." }
}

export async function moderateReport(
  reportId: string,
  decision: "under_review" | "resolved" | "dismissed",
  suspendListing = false
): Promise<ActionResult> {
  const { supabase } = await requireRole("admin")
  if (!uuid.safeParse(reportId).success) return { error: "Invalid report." }
  const { error } = await supabase.rpc("moderate_report", {
    target_report: reportId,
    decision,
    suspend_listing: suspendListing,
  })
  if (error) return { error: databaseError(error) }
  refreshRentals()
  return {
    success: suspendListing
      ? "Report resolved and listing suspended."
      : "Report updated.",
  }
}

export async function moderateFeedback(
  feedbackId: string,
  decision: "under_review" | "resolved" | "dismissed"
): Promise<ActionResult> {
  const { supabase } = await requireRole("admin")
  if (!uuid.safeParse(feedbackId).success) return { error: "Invalid feedback." }
  const { error } = await supabase.rpc("moderate_feedback", {
    target_feedback: feedbackId,
    decision,
  })
  if (error) return { error: databaseError(error) }
  revalidatePath("/admin/feedback")
  return { success: "Feedback updated." }
}
