import Link from "next/link"
import { ArrowUpRight, Building2, MapPin } from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { EmptyState, LinkButton, StatusBadge } from "@/components/shared"
import { ActionButton } from "@/components/action-button"
import { deactivateHouse, deactivateRoom } from "@/actions/properties"
import { currency, date, label, address } from "@/lib/format"
import type { House, Room, Listing, Verification } from "@/types/domain"

export function HouseCards({
  houses,
  rooms,
  admin = false,
}: {
  houses: House[]
  rooms?: Room[]
  admin?: boolean
}) {
  if (!houses.length)
    return (
      <EmptyState
        title="No boarding houses added yet."
        description={
          admin
            ? "Registered properties will appear here."
            : "Add your first property, then set up its rooms, amenities, and listings."
        }
        action={
          !admin && (
            <LinkButton href="/owner/boarding-houses/new">
              Add boarding house
            </LinkButton>
          )
        }
      />
    )
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {houses.map((h) => (
        <article key={h.id} className="rounded-xl border bg-card p-5">
          <div className="mb-5 flex items-start justify-between gap-3">
            <span className="rounded-xl bg-primary/7 p-3 text-primary">
              <Building2 className="size-6" />
            </span>
            <StatusBadge status={h.status} />
          </div>
          <h2 className="font-semibold">{h.name}</h2>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" />
            {address(h) || "No address provided"}
          </p>
          <p className="mt-4 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {h.description || "No description provided."}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            {admin ? (
              <span className="text-xs text-muted-foreground">
                Added {date(h.created_at)}
              </span>
            ) : (
              <>
                <Link
                  href={`/owner/rooms?house=${h.id}`}
                  className="text-xs text-primary"
                >
                  {rooms?.filter((r) => r.boarding_house_id === h.id).length ||
                    0}{" "}
                  rooms →
                </Link>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/owner/boarding-houses/${h.id}/edit`}
                    className="text-xs font-medium text-primary"
                  >
                    Edit property
                  </Link>
                  {h.status === "active" && (
                    <ActionButton
                      action={deactivateHouse.bind(null, h.id)}
                      variant="ghost"
                      confirmation="Deactivate this boarding house? Its listings will return to draft and disappear from public browsing."
                    >
                      Deactivate
                    </ActionButton>
                  )}
                </div>
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  )
}
export function RoomTable({
  rooms,
  houses,
}: {
  rooms: Room[]
  houses: House[]
}) {
  if (!rooms.length)
    return (
      <EmptyState
        title="No rooms have been added."
        description="Add rooms to your boarding houses with their type, monthly rent, and capacity."
        action={
          houses.length > 0 && (
            <LinkButton href="/owner/rooms/new">Add room</LinkButton>
          )
        }
      />
    )
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Room</TableHead>
            <TableHead>Boarding house</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Monthly rent</TableHead>
            <TableHead>Capacity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rooms.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                {r.room_number || "Unnamed room"}
              </TableCell>
              <TableCell>
                {houses.find((h) => h.id === r.boarding_house_id)?.name}
              </TableCell>
              <TableCell>{label(r.room_type)}</TableCell>
              <TableCell>{currency(r.monthly_rent)}</TableCell>
              <TableCell>{r.capacity}</TableCell>
              <TableCell>
                <StatusBadge status={r.status} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-3">
                  <Link
                    href={`/owner/rooms/${r.id}/edit`}
                    className="self-center text-xs font-medium text-primary"
                  >
                    Edit
                  </Link>
                  {r.status !== "inactive" && (
                    <ActionButton
                      action={deactivateRoom.bind(null, r.id)}
                      variant="ghost"
                      confirmation="Deactivate this room? Affected listings will return to draft for review."
                    >
                      Deactivate
                    </ActionButton>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
export function ListingTable({
  listings,
  houses,
  base = "/owner/listings",
}: {
  listings: Listing[]
  houses: House[]
  base?: string
}) {
  if (!listings.length)
    return (
      <EmptyState
        title="No listings here yet."
        description="Listings will appear here once they have been created."
      />
    )
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Listing</TableHead>
            <TableHead>Boarding house</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>
              <span className="sr-only">View listing</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="max-w-xs font-medium whitespace-normal">
                <Link href={`${base}/${l.id}`} className="hover:text-primary">
                  {l.title}
                </Link>
              </TableCell>
              <TableCell>
                {houses.find((h) => h.id === l.boarding_house_id)?.name}
              </TableCell>
              <TableCell>
                <StatusBadge status={l.listing_status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {date(l.created_at)}
              </TableCell>
              <TableCell>
                <Link
                  href={`${base}/${l.id}`}
                  className="flex items-center gap-1 text-xs font-medium text-primary"
                >
                  View
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
export function VerificationTable({
  verifications,
  listings,
  admin = false,
}: {
  verifications: Verification[]
  listings: Listing[]
  admin?: boolean
}) {
  if (!verifications.length)
    return (
      <EmptyState
        title={
          admin
            ? "No listings awaiting verification."
            : "No verification submissions yet."
        }
        description={
          admin
            ? "New submissions will appear here for you to review."
            : "Submit a listing to see its review progress and administrator remarks here."
        }
      />
    )
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Listing</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Remarks</TableHead>
            <TableHead>
              <span className="sr-only">Open review</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {verifications.map((v) => (
            <TableRow key={v.id}>
              <TableCell className="max-w-xs font-medium whitespace-normal">
                {listings.find((l) => l.id === v.listing_id)?.title ||
                  "Listing"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {date(v.date_submitted)}
              </TableCell>
              <TableCell>
                <StatusBadge status={v.status} />
              </TableCell>
              <TableCell className="max-w-sm text-xs whitespace-normal text-muted-foreground">
                {v.remarks || "—"}
              </TableCell>
              <TableCell>
                <Link
                  href={
                    admin
                      ? `/admin/verifications/${v.listing_id}`
                      : `/owner/listings/${v.listing_id}`
                  }
                  className="text-xs font-medium text-primary"
                >
                  {admin && v.status === "pending" ? "Review" : "View"} →
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
