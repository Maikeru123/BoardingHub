import { getOwnerData } from "@/lib/data"
import { DashboardHeader, EmptyState, LinkButton } from "@/components/shared"
import { ListingForm } from "@/components/forms/listing-form"
export default async function NewListingPage() {
  const { houses: allHouses } = await getOwnerData()
  const houses = allHouses.filter(
    (house) =>
      house.status === "active" && house.verification_status === "approved"
  )
  return (
    <>
      <DashboardHeader
        title="Create a listing"
        description="Introduce your property to its future tenants."
      />
      {houses.length ? (
        <ListingForm houses={houses} />
      ) : (
        <EmptyState
          title="Verify a boarding house first."
          description="Listings can be created after the boarding house is approved and its rooms are ready."
          action={
            <LinkButton href="/owner/boarding-houses">
              View boarding houses
            </LinkButton>
          }
        />
      )}
    </>
  )
}
