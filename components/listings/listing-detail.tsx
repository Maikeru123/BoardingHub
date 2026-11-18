import Image from "next/image"
import {
  BedDouble,
  Building2,
  Phone,
  ShieldCheck,
  Check,
  Users,
} from "lucide-react"
import { Panel, StatusBadge } from "@/components/shared"
import { currency, label, date } from "@/lib/format"
import { LocationDisplay } from "@/components/boarding-house/location-display"
import type {
  ListingDetail as Detail,
  ListingVerification,
} from "@/types/domain"
export function VerificationHistory({
  listingVerifications,
}: {
  listingVerifications: ListingVerification[]
}) {
  return (
    <div className="space-y-5">
      {listingVerifications.length ? (
        listingVerifications.map((v) => (
          <div key={v.id} className="border-l-2 border-primary/20 pl-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge status={v.status} />
              <span className="text-xs text-muted-foreground">
                Submitted {date(v.date_submitted)}
              </span>
            </div>
            {v.remarks && (
              <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">
                {v.remarks}
              </p>
            )}
            {v.date_reviewed && (
              <p className="mt-2 text-xs text-muted-foreground">
                Reviewed {date(v.date_reviewed)}
              </p>
            )}
          </div>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          This listing has not been published yet.
        </p>
      )}
    </div>
  )
}
export function ListingDetail({
  detail,
  showPhotos = true,
  children,
}: {
  detail: Detail
  showPhotos?: boolean
  children?: React.ReactNode
}) {
  const { listing, house, rooms, amenities, photos } = detail
  return (
    <div className="space-y-6">
      {showPhotos &&
        (photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className={
                  index === 0
                    ? "relative col-span-2 aspect-[16/9] overflow-hidden rounded-xl sm:col-span-3"
                    : "relative aspect-[4/3] overflow-hidden rounded-lg bg-muted"
                }
              >
                {photo.url && (
                  <Image
                    src={photo.url}
                    alt={`${listing.title} — photo ${index + 1}`}
                    fill
                    unoptimized
                    sizes={index === 0 ? "80vw" : "30vw"}
                    className="object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[16/6] items-center justify-center rounded-xl border bg-muted text-muted-foreground">
            <div className="text-center">
              <Building2 className="mx-auto mb-2 size-10 opacity-40" />
              <p className="text-sm">No property photo available</p>
            </div>
          </div>
        ))}
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Panel title="About this listing">
            <p className="text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
              {listing.description || "No listing description provided."}
            </p>
          </Panel>
          <Panel title={house.name} description="Boarding house information">
            <div className="space-y-4">
              <LocationDisplay location={house} />
              <p className="text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
                {house.description || "No property description provided."}
              </p>
            </div>
          </Panel>
          <Panel
            title="Rooms"
            description="Room status describes general usability. Contact the property to confirm details."
          >
            {rooms.length ? (
              <div className="space-y-4">
                {rooms.map((room) => (
                  <div key={room.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex gap-3">
                        <span className="rounded-lg bg-primary/7 p-3 text-primary">
                          <BedDouble className="size-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold">
                            {room.room_number || label(room.room_type)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {label(room.room_type)} ·{" "}
                            <Users className="inline size-3" /> {room.capacity}{" "}
                            {room.capacity === 1 ? "person" : "people"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-primary">
                          {currency(room.monthly_rent)}
                          <span className="text-xs font-normal text-muted-foreground">
                            {" "}
                            / month
                          </span>
                        </p>
                        <div className="mt-2">
                          <StatusBadge status={room.status} />
                        </div>
                      </div>
                    </div>
                    {room.description && (
                      <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">
                        {room.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No rooms have been added.
              </p>
            )}
          </Panel>
          <Panel title="Amenities">
            {amenities.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {amenities.map((a) => (
                  <p key={a.id} className="flex items-center gap-2 text-sm">
                    <Check className="size-4 text-primary" />
                    {a.name}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No amenities listed.
              </p>
            )}
          </Panel>
          <Panel title="House rules">
            <p className="text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
              {house.house_rules || "No house rules provided."}
            </p>
          </Panel>
        </div>
        <aside className="space-y-6">
          {children}
          <Panel title="Property contact">
            <p className="text-sm font-medium">{house.name}</p>
            {house.contact_number ? (
              <a
                href={`tel:${house.contact_number.replace(/[^+0-9]/g, "")}`}
                className="mt-4 flex items-center gap-2 text-sm text-primary"
              >
                <Phone className="size-4" />
                {house.contact_number}
              </a>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No contact number provided.
              </p>
            )}
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              Explore the property details and contact the owner directly.
              Rental requests will be available in a later release.
            </p>
          </Panel>
          {listing.listing_status === "published" && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <ShieldCheck className="size-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-medium">Administrator reviewed</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  This listing was reviewed before publication.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
