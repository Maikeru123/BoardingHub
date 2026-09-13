import { notFound } from "next/navigation"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { ListingForm } from "@/components/forms/listing-form"
export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { houses, listings } = await getOwnerData()
  const listing = listings.find((l) => l.id === id)
  if (!listing) notFound()
  return (
    <>
      <DashboardHeader title="Edit listing" description={listing.title} />
      {["draft", "rejected"].includes(listing.listing_status) ? (
        <ListingForm houses={houses} listing={listing} />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This listing is locked while under review or published. Property
            changes return the listing to draft for a new review.
          </p>
          <LinkButton href={`/owner/listings/${id}`} variant="outline">
            Back to listing
          </LinkButton>
        </div>
      )}
    </>
  )
}
