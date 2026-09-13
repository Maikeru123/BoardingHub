import { getOwnerData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { HouseForm } from "@/components/forms/house-form"
export default async function NewHousePage() {
  const { amenities } = await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="Add a boarding house"
        description="Start with the details that make your property feel like home."
      />
      <HouseForm amenities={amenities} />
    </>
  )
}
