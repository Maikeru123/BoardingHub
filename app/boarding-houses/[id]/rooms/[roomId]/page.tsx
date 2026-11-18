import Link from "next/link"
import { BedDouble, Check, Users } from "lucide-react"
import { getPublicRoomDetail } from "@/lib/data/boarding-houses"
import { PublicNavbar } from "@/components/public-navbar"
import {
  DashboardHeader,
  LinkButton,
  Panel,
  StatusBadge,
} from "@/components/shared"
import { PhotoGallery } from "@/components/discovery/photo-gallery"
import { RentalRequestForm } from "@/components/rentals/rental-request-form"
import { ReportListingForm } from "@/components/rentals/community-forms"
import { getPublicSessionProfile } from "@/lib/auth"
import { LocationDisplay } from "@/components/boarding-house/location-display"
import { currency, date, label } from "@/lib/format"
export const dynamic = "force-dynamic"
export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string; roomId: string }>
}) {
  const { id, roomId } = await params
  const [{ detail, room, photos, availability }, session] = await Promise.all([
    getPublicRoomDetail(id, roomId),
    getPublicSessionProfile(),
  ])
  return (
    <>
      <PublicNavbar />
      <main id="main-content" className="page-container py-10">
        <DashboardHeader
          title={
            room.room_number
              ? `Room ${room.room_number}`
              : label(room.room_type)
          }
          description={detail.house.name}
          action={
            <LinkButton href={`/boarding-houses/${id}`} variant="outline">
              Back to property
            </LinkButton>
          }
        />
        <PhotoGallery
          photos={photos}
          name={room.room_number ? `Room ${room.room_number}` : "Room"}
        />
        <div className="mt-7 grid items-start gap-7 xl:grid-cols-[1fr_340px]">
          <div className="space-y-7">
            <Panel title="Room information">
              <div className="grid gap-5 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Room type</p>
                  <p className="mt-1 font-medium">{label(room.room_type)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="mt-1 flex items-center gap-1 font-medium">
                    <Users className="size-4" /> {room.capacity}{" "}
                    {room.capacity === 1 ? "person" : "people"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    General status
                  </p>
                  <div className="mt-1">
                    <StatusBadge status={room.status} />
                  </div>
                </div>
              </div>
              <p className="mt-6 text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
                {room.description || "No room description provided."}
              </p>
            </Panel>
            <Panel title="Property amenities">
              <div className="grid gap-4 sm:grid-cols-2">
                {detail.amenities.map((amenity) => (
                  <p
                    key={amenity.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Check className="size-4 text-primary" /> {amenity.name}
                  </p>
                ))}
              </div>
            </Panel>
            <Panel title="Boarding house location">
              <LocationDisplay location={detail.house} />
            </Panel>
          </div>
          <aside className="space-y-5 xl:sticky xl:top-24">
            <Panel title="Monthly rent">
              <p className="text-3xl font-semibold text-primary">
                {currency(room.monthly_rent)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">per month</p>
              {availability?.availability_state === "future_reserved" && (
                <p className="mt-3 rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
                  Future reservation begins{" "}
                  {date(availability.next_reserved_start)}. Choose
                  non-conflicting dates when requesting this room.
                </p>
              )}
            </Panel>
            {session?.profile.role === "tenant" ? (
              <Panel
                title="Rent This Room"
                description="Choose the rental period that fits your stay."
              >
                <RentalRequestForm room={room} house={detail.house} />
              </Panel>
            ) : (
              <Panel title="Rent This Room">
                <p className="mb-4 text-sm text-muted-foreground">
                  {session
                    ? "Only tenant accounts can submit rental requests."
                    : "Sign in with a tenant account to request this room."}
                </p>
                {!session && (
                  <LinkButton href="/login">Sign in to rent</LinkButton>
                )}
              </Panel>
            )}
            <Link
              href={`/boarding-houses/${id}`}
              className="flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium"
            >
              <BedDouble className="size-4" /> View property and contact owner
            </Link>
            {session && (
              <Panel
                title="Report this listing"
                description="Reports are reviewed by BoardingHub administrators."
              >
                <ReportListingForm listingId={detail.listing.id} />
              </Panel>
            )}
          </aside>
        </div>
      </main>
    </>
  )
}
