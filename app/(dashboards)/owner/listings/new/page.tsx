import { getOwnerData } from "@/lib/data"
import { DashboardHeader, EmptyState, LinkButton } from "@/components/shared"
import { ListingForm } from "@/components/forms/listing-form"
export default async function NewListingPage() {
  const { houses } = await getOwnerData()
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
          title="Add a boarding house first."
          description="Choose a property for your listing after creating your first boarding house."
          action={
            <LinkButton href="/owner/boarding-houses/new">
              Add boarding house
            </LinkButton>
          }
        />
      )}
    </>
  )
}
