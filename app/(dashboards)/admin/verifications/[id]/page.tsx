import { getListingDetail } from "@/lib/data"
import { DashboardHeader, Panel, StatusBadge } from "@/components/shared"
import {
  ListingDetail,
  VerificationHistory,
} from "@/components/listings/listing-detail"
import { ReviewForm } from "@/components/forms/review-form"
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getListingDetail(id, "admin")
  return (
    <>
      <DashboardHeader
        title={detail.listing.title}
        description="Review the property, rooms, amenities, rules, and photos before making a decision."
        action={<StatusBadge status={detail.listing.listing_status} />}
      />
      <ListingDetail detail={detail}>
        {detail.listing.listing_status === "for_review" && (
          <Panel title="Review this listing">
            <ReviewForm listingId={id} />
          </Panel>
        )}
        <Panel title="Review history">
          <VerificationHistory verifications={detail.verifications} />
        </Panel>
      </ListingDetail>
    </>
  )
}
