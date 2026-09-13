import { getListingDetail } from "@/lib/data"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { ListingDetail } from "@/components/listings/listing-detail"
export default async function TenantListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const detail = await getListingDetail(id, "tenant")
  return (
    <>
      <DashboardHeader
        title={detail.listing.title}
        description={detail.house.name}
        action={
          <LinkButton href="/tenant/listings" variant="outline">
            Back to listings
          </LinkButton>
        }
      />
      <ListingDetail detail={detail} />
    </>
  )
}
