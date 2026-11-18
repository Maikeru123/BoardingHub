import Link from "next/link"
import {
  BedDouble,
  Check,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Panel, StatusBadge } from "@/components/shared"
import { buttonVariants } from "@/components/ui/button"
import { LocationDisplay } from "@/components/boarding-house/location-display"
import { DateRangeSelector } from "@/components/availability/date-range-selector"
import { ContactOwner } from "@/components/inquiries/contact-owner"
import { PhotoGallery } from "@/components/discovery/photo-gallery"
import { address, currency, date, label } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ListingDetail, Role } from "@/types/domain"

export function PropertyDetail({
  detail,
  viewerRole,
  viewerId,
}: {
  detail: ListingDetail
  viewerRole?: Role
  viewerId?: string
}) {
  const { house, listing, rooms, amenities, photos, owner } = detail
  const canContact = viewerRole === "tenant"
  const loginDestination = `/login?next=${encodeURIComponent(`/boarding-houses/${house.id}`)}`
  return (
    <div className="space-y-8">
      <PhotoGallery photos={photos} name={house.name} />
      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-7">
          <Panel title="About this boarding house" description={listing.title}>
            <div className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p className="whitespace-pre-wrap">
                {house.description || "No property description provided."}
              </p>
              {listing.description &&
                listing.description !== house.description && (
                  <p className="whitespace-pre-wrap">{listing.description}</p>
                )}
            </div>
          </Panel>
          <Panel
            title="Available rooms"
            description="General status only. Dates are not yet checked against rental transactions."
          >
            {rooms.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {rooms.map((room) => (
                  <Card key={room.id} className="gap-0 py-0 shadow-none">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <span className="rounded-lg bg-primary/7 p-3 text-primary">
                          <BedDouble className="size-5" />
                        </span>
                        <StatusBadge
                          status={
                            detail.roomAvailability?.find(
                              (item) => item.room_id === room.id
                            )?.availability_state || room.status
                          }
                        />
                      </div>
                      <h3 className="mt-4 font-semibold">
                        {room.room_number
                          ? `Room ${room.room_number}`
                          : label(room.room_type)}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {label(room.room_type)} ·{" "}
                        <Users className="inline size-3" /> {room.capacity}{" "}
                        {room.capacity === 1 ? "person" : "people"}
                      </p>
                      <p className="mt-4 text-lg font-semibold text-primary">
                        {currency(room.monthly_rent)}{" "}
                        <span className="text-xs font-normal text-muted-foreground">
                          / month
                        </span>
                      </p>
                      {room.description && (
                        <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {room.description}
                        </p>
                      )}
                      {detail.roomAvailability?.find(
                        (item) => item.room_id === room.id
                      )?.availability_state === "future_reserved" && (
                        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
                          Reserved from{" "}
                          {date(
                            detail.roomAvailability?.find(
                              (item) => item.room_id === room.id
                            )?.next_reserved_start || null
                          )}
                          . Earlier non-conflicting dates remain requestable.
                        </p>
                      )}
                      <Link
                        href={`/boarding-houses/${house.id}/rooms/${room.id}`}
                        className={cn(
                          buttonVariants({ variant: "outline" }),
                          "mt-5 h-9 w-full"
                        )}
                      >
                        View room details
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No rooms are currently available.
              </p>
            )}
          </Panel>
          <Panel title="Amenities">
            {amenities.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {amenities.map((amenity) => (
                  <p
                    key={amenity.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Check className="size-4 text-primary" /> {amenity.name}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No amenities are listed.
              </p>
            )}
          </Panel>
          <Panel title="House rules">
            <p className="text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
              {house.house_rules || "No house rules provided."}
            </p>
          </Panel>
          <Panel
            title="Location"
            description={address(house) || "Structured address"}
          >
            <LocationDisplay location={house} />
          </Panel>
        </div>
        <aside className="space-y-5 xl:sticky xl:top-24">
          <Panel title="Check your dates">
            <DateRangeSelector />
          </Panel>
          <Panel title="Property owner">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserRound className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">
                  {owner
                    ? `${owner.first_name} ${owner.last_name}`
                    : "Property owner"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Owner of {house.name}
                </p>
              </div>
            </div>
            {house.contact_number && (
              <a
                href={`tel:${house.contact_number.replace(/[^+0-9]/g, "")}`}
                className="mt-4 flex items-center gap-2 text-sm text-primary"
              >
                <Phone className="size-4" /> {house.contact_number}
              </a>
            )}
            <div className="mt-5">
              {canContact ? (
                <ContactOwner listingId={listing.id} houseName={house.name} />
              ) : !viewerRole ? (
                <Link
                  href={loginDestination}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "h-11 w-full"
                  )}
                >
                  <Phone /> Sign in to contact owner
                </Link>
              ) : viewerRole === "owner" && viewerId === house.owner_id ? (
                <p className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">
                  This is your property.
                </p>
              ) : (
                <p className="rounded-lg bg-muted p-3 text-center text-xs text-muted-foreground">
                  Tenant accounts can start inquiries.
                </p>
              )}
            </div>
          </Panel>
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <ShieldCheck className="size-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-medium">Administrator reviewed</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                The connected listing was reviewed before publication.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
