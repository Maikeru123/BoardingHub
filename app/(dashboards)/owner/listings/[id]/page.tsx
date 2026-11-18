import Link from "next/link"
import { Send, Pencil, CheckCircle2, Circle } from "lucide-react"
import { getListingDetail } from "@/lib/data"
import { submitListing } from "@/actions/listings"
import {
  DashboardHeader,
  LinkButton,
  Panel,
  StatusBadge,
} from "@/components/shared"
import { ActionButton } from "@/components/action-button"
import { ListingDetail } from "@/components/listings/listing-detail"
export default async function OwnerListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getListingDetail(id, "owner")
  const editable = ["draft", "rejected"].includes(detail.listing.listing_status)
  const requirements = [
    {
      label: "Approved boarding house",
      complete:
        detail.house.status === "active" &&
        detail.house.verification_status === "approved",
      href: `/owner/boarding-houses/${detail.house.id}/edit`,
      action: "Edit property",
    },
    {
      label: "At least one available room",
      complete: detail.rooms.some((room) => room.status === "available"),
      href: `/owner/rooms?house=${detail.house.id}`,
      action: "Manage rooms",
    },
    {
      label: "A primary boarding house photo",
      complete: detail.photos.some((photo) => photo.is_primary),
      href: `/owner/boarding-houses/${detail.house.id}/edit#property-photos`,
      action: "Manage property photos",
    },
  ]
  return (
    <>
      <DashboardHeader
        title={detail.listing.title}
        description={detail.house.name}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge status={detail.listing.listing_status} />
            {editable && (
              <LinkButton href={`/owner/listings/${id}/edit`} variant="outline">
                <Pencil className="size-4" />
                Edit listing
              </LinkButton>
            )}
          </div>
        }
      />
      {editable && (
        <div className="mb-6">
          <Panel
            title={
              detail.listing.listing_status === "rejected"
                ? "Prepare your listing for resubmission"
                : "Draft saved — not submitted yet"
            }
            description="The boarding house has already been verified. Complete these requirements, then publish the listing."
          >
            <ul
              className="mb-5 space-y-3 text-sm"
              aria-label="Submission requirements"
            >
              {requirements.map((requirement) => (
                <li
                  key={requirement.label}
                  className="flex flex-wrap items-center gap-2"
                >
                  {requirement.complete ? (
                    <CheckCircle2
                      className="size-4 text-emerald-600"
                      aria-hidden
                    />
                  ) : (
                    <Circle className="size-4 text-amber-600" aria-hidden />
                  )}
                  <span>{requirement.label}</span>
                  <span className="sr-only">
                    {requirement.complete ? "Complete" : "Required"}
                  </span>
                  {!requirement.complete && (
                    <Link
                      href={requirement.href}
                      className="font-medium text-primary underline"
                    >
                      {requirement.action}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <ActionButton
              action={submitListing.bind(null, id)}
              variant="default"
              disabled={
                !requirements.every((requirement) => requirement.complete)
              }
              confirmation="Publish this listing for tenants to discover?"
            >
              <Send className="size-4" />
              Publish listing
            </ActionButton>
          </Panel>
        </div>
      )}
      <ListingDetail detail={detail} />
    </>
  )
}
