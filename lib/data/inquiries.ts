import "server-only"

import { notFound } from "next/navigation"
import type { SupabaseClient } from "@supabase/supabase-js"
import { requireRole } from "@/lib/auth"
import { photoBucketForPath } from "@/lib/photo-storage"
import { uuid } from "@/lib/validation"
import type {
  InquiryDetail,
  InquiryMessage,
  InquirySummary,
  InquiryThread,
  Role,
} from "@/types/domain"
import type { Database } from "@/types/supabase"

type Client = SupabaseClient<Database>

async function signPhoto(
  supabase: Awaited<ReturnType<typeof requireRole>>["supabase"],
  imagePath: string | null
) {
  if (!imagePath) return null
  const { data, error } = await supabase.storage
    .from(photoBucketForPath(imagePath))
    .createSignedUrl(imagePath, 300)
  if (error) return null
  return { image_path: imagePath, url: data.signedUrl || null }
}

export async function getInquirySummaries(
  role: Extract<Role, "tenant" | "owner">,
  page = 1
) {
  const { supabase } = await requireRole(role)
  const current = Math.max(1, Math.floor(page))
  const { data, error } = await supabase.rpc("list_inquiry_summaries", {
    page_size: 30,
    page_offset: (current - 1) * 30,
  })
  if (error) throw new Error("Unable to load inquiries.")
  const summaries: InquirySummary[] = await Promise.all(
    (data || []).map(async (row) => {
      const thread: InquiryThread = {
        id: row.thread_id,
        tenant_id: row.tenant_id,
        listing_id: row.listing_id,
        status: row.thread_status,
        last_message_at: row.last_message_at,
        created_at: row.thread_created_at,
        updated_at: row.thread_updated_at,
      }
      const latestMessage: InquiryMessage | null = row.latest_message_id
        ? {
            id: row.latest_message_id,
            thread_id: row.thread_id,
            sender_id: row.latest_sender_id!,
            message: row.latest_message!,
            created_at: row.latest_message_created_at!,
            read_at: row.latest_message_read_at,
          }
        : null
      return {
        thread,
        listing: {
          id: row.listing_id,
          title: row.listing_title,
          boarding_house_id: row.house_id,
        },
        house: { id: row.house_id, name: row.house_name },
        photo: await signPhoto(supabase, row.primary_photo_path),
        otherParticipant: {
          id: row.other_profile_id,
          first_name: row.other_first_name,
          last_name: row.other_last_name,
        },
        latestMessage,
        unreadCount: Number(row.unread_count),
      }
    })
  )
  return {
    summaries,
    page: current,
    total: Number(data?.[0]?.total_count || 0),
  }
}

export async function getInquiryDetail(
  id: string,
  role: Extract<Role, "tenant" | "owner">
): Promise<InquiryDetail> {
  if (!uuid.safeParse(id).success) notFound()
  const { supabase, user } = await requireRole(role)
  const { data: thread, error } = await supabase
    .from("inquiry_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error("Unable to load this inquiry.")
  if (!thread || (role === "tenant" && thread.tenant_id !== user.id)) notFound()
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id,title,boarding_house_id")
    .eq("id", thread.listing_id)
    .maybeSingle()
  if (listingError) throw new Error("Unable to load the inquiry listing.")
  if (!listing) notFound()
  const { data: house, error: houseError } = await supabase
    .from("boarding_houses")
    .select("id,name,owner_id")
    .eq("id", listing.boarding_house_id)
    .maybeSingle()
  if (houseError) throw new Error("Unable to load the inquiry property.")
  if (!house || (role === "owner" && house.owner_id !== user.id)) notFound()
  const otherId = role === "tenant" ? house.owner_id : thread.tenant_id
  const [profileResult, photosResult, messagesResult, unreadResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id,first_name,last_name")
        .eq("id", otherId)
        .maybeSingle(),
      supabase
        .from("boarding_house_photos")
        .select("image_path")
        .eq("boarding_house_id", house.id)
        .eq("is_primary", true)
        .limit(1),
      supabase
        .from("inquiry_messages")
        .select("*")
        .eq("thread_id", id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("inquiry_messages")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", id)
        .neq("sender_id", user.id)
        .is("read_at", null),
    ])
  if (
    profileResult.error ||
    photosResult.error ||
    messagesResult.error ||
    unreadResult.error
  )
    throw new Error("Unable to load this conversation.")
  const messages = (messagesResult.data || []).reverse()
  return {
    thread,
    listing,
    house,
    photo: await signPhoto(
      supabase,
      photosResult.data?.[0]?.image_path || null
    ),
    otherParticipant: profileResult.data || null,
    latestMessage: messages.at(-1) || null,
    unreadCount: unreadResult.count || 0,
    messages,
  }
}

export async function getInquiryStats(role: Extract<Role, "tenant" | "owner">) {
  const { supabase, user } = await requireRole(role)
  const [openResult, unreadResult] = await Promise.all([
    supabase
      .from("inquiry_threads")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("inquiry_messages")
      .select("id", { count: "exact", head: true })
      .neq("sender_id", user.id)
      .is("read_at", null),
  ])
  if (openResult.error || unreadResult.error)
    throw new Error("Unable to load inquiry statistics.")
  return { open: openResult.count || 0, unread: unreadResult.count || 0 }
}

export async function getNavigationUnreadCount(
  role: Extract<Role, "tenant" | "owner">
) {
  const { supabase, user } = await requireRole(role)
  return getSessionUnreadInquiryCount(supabase, user.id)
}

export async function getSessionUnreadInquiryCount(
  supabase: Client,
  userId: string
) {
  const { count, error } = await supabase
    .from("inquiry_messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", userId)
    .is("read_at", null)
  if (error) {
    console.error("Unread inquiry count failed", { code: error.code })
    return 0
  }
  return count || 0
}
