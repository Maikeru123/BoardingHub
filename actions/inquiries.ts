"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { databaseError } from "@/lib/action-errors"
import { inquiryMessageSchema, uuid } from "@/lib/validation"
import type { ActionResult } from "@/types/domain"

function revalidateInquiries(threadId?: string) {
  revalidatePath("/tenant", "layout")
  revalidatePath("/tenant/inquiries")
  revalidatePath("/owner", "layout")
  revalidatePath("/owner/inquiries")
  if (threadId) {
    revalidatePath(`/tenant/inquiries/${threadId}`)
    revalidatePath(`/owner/inquiries/${threadId}`)
  }
}

export async function startInquiry(
  listingId: string,
  message: string
): Promise<ActionResult> {
  const { supabase } = await requireRole("tenant")
  if (!uuid.safeParse(listingId).success) return { error: "Invalid listing." }
  const parsed = inquiryMessageSchema.safeParse({ message })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { data: threadId, error } = await supabase.rpc("start_inquiry", {
    target_listing: listingId,
    first_message: parsed.data.message,
  })
  if (error) return { error: databaseError(error) }
  revalidateInquiries(threadId)
  return {
    success: "Your inquiry was sent.",
    redirectTo: `/tenant/inquiries/${threadId}`,
    entityId: threadId,
  }
}

export async function sendInquiryMessage(
  threadId: string,
  message: string
): Promise<ActionResult> {
  const { supabase, profile } = await requireRole()
  if (!["tenant", "owner"].includes(profile.role))
    return { error: "This account cannot send inquiry messages." }
  if (!uuid.safeParse(threadId).success) return { error: "Invalid inquiry." }
  const parsed = inquiryMessageSchema.safeParse({ message })
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { error } = await supabase.rpc("send_inquiry_message", {
    target_thread: threadId,
    body: parsed.data.message,
  })
  if (error) return { error: databaseError(error) }
  revalidateInquiries(threadId)
  return { success: "Message sent." }
}

export async function markInquiryRead(threadId: string): Promise<ActionResult> {
  const { supabase, profile } = await requireRole()
  if (!["tenant", "owner"].includes(profile.role))
    return { error: "This account cannot read inquiry messages." }
  if (!uuid.safeParse(threadId).success) return { error: "Invalid inquiry." }
  const { error } = await supabase.rpc("mark_inquiry_read", {
    target_thread: threadId,
  })
  if (error) return { error: databaseError(error) }
  revalidateInquiries(threadId)
  return { success: "Messages marked as read." }
}

export async function setInquiryStatus(
  threadId: string,
  status: "open" | "closed"
): Promise<ActionResult> {
  const { supabase } = await requireRole("owner")
  if (!uuid.safeParse(threadId).success) return { error: "Invalid inquiry." }
  if (!["open", "closed"].includes(status))
    return { error: "Invalid inquiry status." }
  const { error } = await supabase.rpc("set_inquiry_status", {
    target_thread: threadId,
    new_status: status,
  })
  if (error) return { error: databaseError(error) }
  revalidateInquiries(threadId)
  return {
    success: status === "closed" ? "Inquiry closed." : "Inquiry reopened.",
  }
}
