import Image from "next/image"
import Link from "next/link"
import { Building2, MessageSquare } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { EmptyState, StatusBadge } from "@/components/shared"
import { date } from "@/lib/format"
import type { InquirySummary, Role } from "@/types/domain"

export function InquiryList({
  items,
  role,
}: {
  items: InquirySummary[]
  role: Extract<Role, "tenant" | "owner">
}) {
  if (!items.length)
    return (
      <EmptyState
        icon={MessageSquare}
        title={
          role === "tenant"
            ? "You have no inquiries yet."
            : "No tenants have contacted you yet."
        }
        description={
          role === "tenant"
            ? "Open a published boarding house and contact its owner to start a conversation."
            : "New messages about your published listings will appear here."
        }
      />
    )
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {items.map((item) => (
        <Link
          key={item.thread.id}
          href={`/${role}/inquiries/${item.thread.id}`}
          className="grid grid-cols-[64px_minmax(0,1fr)] gap-4 border-b p-4 transition-colors last:border-0 hover:bg-muted/50 sm:grid-cols-[72px_minmax(0,1fr)_auto]"
        >
          <div className="relative size-16 overflow-hidden rounded-lg bg-muted sm:size-18">
            {item.photo?.url ? (
              <Image
                src={item.photo.url}
                alt={`${item.house.name} primary photo`}
                fill
                unoptimized
                sizes="72px"
                className="object-cover"
              />
            ) : (
              <Building2 className="absolute inset-0 m-auto size-7 text-muted-foreground/40" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-medium">
                {role === "owner"
                  ? `${item.otherParticipant?.first_name || "Tenant"} ${item.otherParticipant?.last_name || ""}`
                  : item.house.name}
              </h2>
              {item.unreadCount > 0 && (
                <Badge className="rounded-full border-0 bg-primary px-2">
                  {item.unreadCount} new
                </Badge>
              )}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {role === "owner"
                ? item.house.name
                : `${item.otherParticipant?.first_name || "Owner"} · ${item.listing.title}`}
            </p>
            <p
              className={`mt-3 truncate text-sm ${item.unreadCount ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {item.latestMessage?.message || "No messages yet"}
            </p>
          </div>
          <div className="col-start-2 flex items-center justify-between gap-3 sm:col-start-3 sm:flex-col sm:items-end">
            <span className="text-[11px] text-muted-foreground">
              {date(item.thread.last_message_at || item.thread.created_at)}
            </span>
            <StatusBadge status={item.thread.status} />
          </div>
        </Link>
      ))}
    </div>
  )
}
