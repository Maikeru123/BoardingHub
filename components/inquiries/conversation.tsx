import Image from "next/image"
import Link from "next/link"
import { Building2 } from "lucide-react"
import { ActionButton } from "@/components/action-button"
import {
  MessageComposer,
  InquiryReadMarker,
} from "@/components/inquiries/message-composer"
import { StatusBadge } from "@/components/shared"
import { setInquiryStatus } from "@/actions/inquiries"
import type { InquiryDetail, Role } from "@/types/domain"

const messageTime = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value))

export function Conversation({
  detail,
  role,
  userId,
}: {
  detail: InquiryDetail
  role: Extract<Role, "tenant" | "owner">
  userId: string
}) {
  const otherName = detail.otherParticipant
    ? `${detail.otherParticipant.first_name} ${detail.otherParticipant.last_name}`
    : role === "tenant"
      ? "Property owner"
      : "Tenant"
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <InquiryReadMarker
        threadId={detail.thread.id}
        unread={detail.unreadCount}
      />
      <header className="flex flex-wrap items-center justify-between gap-4 border-b p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            {detail.photo?.url ? (
              <Image
                src={detail.photo.url}
                alt={`${detail.house.name} primary photo`}
                fill
                unoptimized
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <Building2 className="absolute inset-0 m-auto size-5 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{otherName}</h2>
            <Link
              href={`/boarding-houses/${detail.house.id}`}
              className="text-xs text-primary hover:underline"
            >
              {detail.house.name} · {detail.listing.title}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={detail.thread.status} />
          {role === "owner" && (
            <ActionButton
              action={setInquiryStatus.bind(
                null,
                detail.thread.id,
                detail.thread.status === "open" ? "closed" : "open"
              )}
              confirmation={
                detail.thread.status === "open"
                  ? "Closing makes this conversation read-only until you reopen it."
                  : undefined
              }
            >
              {detail.thread.status === "open" ? "Close inquiry" : "Reopen"}
            </ActionButton>
          )}
        </div>
      </header>
      <div className="max-h-[58vh] min-h-105 space-y-4 overflow-y-auto bg-muted/20 p-4 sm:p-6">
        {detail.messages.map((message) => {
          const mine = message.sender_id === userId
          return (
            <div
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${mine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card"}`}
              >
                <p className="text-sm leading-6 whitespace-pre-wrap">
                  {message.message}
                </p>
                <p
                  className={`mt-2 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {messageTime(message.created_at)}
                  {mine && message.read_at ? " · Read" : ""}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <MessageComposer
        threadId={detail.thread.id}
        disabled={detail.thread.status === "closed"}
      />
    </div>
  )
}
