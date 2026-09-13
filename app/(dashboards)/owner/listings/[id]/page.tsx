import { Send, Pencil } from "lucide-react"
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
      <div className="mb-6">
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
          {editable && (
            <div className="mb-6 space-y-4">
              <p className="text-xs leading-6 text-muted-foreground">
                Ready to share your space? Your active property needs a city and
                province, an available room, and a primary photo.
              </p>
              <ActionButton
                action={submitListing.bind(null, id)}
                variant="default"
                confirmation="Submit this listing for administrator verification? Listing details and photos will be locked while it is being reviewed."
              >
                <Send className="size-4" />
                Submit for review
              </ActionButton>
            </div>
          )}
          <VerificationHistory verifications={detail.verifications} />
        </Panel>
      </ListingDetail>
    </>
  )
}
