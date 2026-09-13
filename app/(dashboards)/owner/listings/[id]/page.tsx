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
import {
  ListingDetail,
  VerificationHistory,
} from "@/components/listings/listing-detail"
import { PhotoManager } from "@/components/listings/photo-manager"
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
      label: "Active property with a city and province",
      complete:
        detail.house.status === "active" &&
        Boolean(detail.house.city?.trim() && detail.house.province?.trim()),
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
      label: "A primary listing photo",
      complete: detail.photos.some((photo) => photo.is_primary),
      href: "#listing-photos",
      action: "Add a photo below",
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
            description="Complete these requirements, then submit your listing to the administrator's review queue."
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
              confirmation="Submit this listing for administrator verification? Listing details and photos will be locked while it is being reviewed."
            >
              <Send className="size-4" />
              Submit for review
            </ActionButton>
          </Panel>
        </div>
      )}
      {detail.listing.listing_status === "for_review" && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm"
        >
          Submitted for administrator review. You can follow the decision in
          Verification status.
        </div>
      )}
      <div id="listing-photos" className="mb-6 scroll-mt-6">
        <Panel
          title="Listing photos"
          description="Your primary photo is shown when tenants explore listings."
        >
          <PhotoManager
            listingId={id}
            photos={detail.photos}
            editable={editable}
          />
        </Panel>
      </div>
      <ListingDetail detail={detail} showPhotos={false}>
        <Panel title="Verification status">
          <VerificationHistory verifications={detail.verifications} />
        </Panel>
      </ListingDetail>
    </>
  )
}
