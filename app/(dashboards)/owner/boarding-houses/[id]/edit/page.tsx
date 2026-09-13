import { notFound } from "next/navigation"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { HouseForm } from "@/components/forms/house-form"
export default async function EditHousePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { houses, amenities, houseAmenities } = await getOwnerData()
  const house = houses.find((h) => h.id === id)
  if (!house) notFound()
  return (
    <>
      <DashboardHeader title="Edit boarding house" description={house.name} />
      {house.status === "suspended" ? (
        <p className="text-sm text-muted-foreground">
          This property is suspended. Contact an administrator before making
          changes.
        </p>
      ) : (
        <HouseForm
          house={house}
          amenities={amenities}
          selected={houseAmenities
            .filter((a) => a.boarding_house_id === id)
            .map((a) => a.amenity_id)}
        />
      )}
    </>
  )
}
