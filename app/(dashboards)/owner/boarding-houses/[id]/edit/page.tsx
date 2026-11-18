import { notFound } from "next/navigation"
import { getOwnerData } from "@/lib/data"
import { DashboardHeader, Panel } from "@/components/shared"
import { HouseForm } from "@/components/forms/house-form"
import { BoardingHousePhotoManager } from "@/components/boarding-house/photo-manager"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ActionButton } from "@/components/action-button"
import { submitBoardingHouse } from "@/actions/properties"
export default async function EditHousePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ "photo-upload"?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const { houses, amenities, houseAmenities, photos } = await getOwnerData()
  const house = houses.find((h) => h.id === id)
  if (!house) notFound()
  return (
    <>
      <DashboardHeader
        title="Edit boarding house"
        description={`${house.name} · Verification: ${house.verification_status.replaceAll("_", " ")}`}
        action={
          ["draft", "rejected", "for_correction"].includes(
            house.verification_status
          ) &&
          photos.some(
            (photo) => photo.boarding_house_id === house.id && photo.is_primary
          ) ? (
            <ActionButton
              action={submitBoardingHouse.bind(null, house.id)}
              variant="default"
              confirmation="Submit this boarding house for administrator verification?"
            >
              Submit for verification
            </ActionButton>
          ) : undefined
        }
      />
      {house.verification_remarks && (
        <Alert className="mb-6">
          <AlertDescription>{house.verification_remarks}</AlertDescription>
        </Alert>
      )}
      {query["photo-upload"] === "retry" && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            The boarding house was created, but one or more photos did not
            upload. Add the remaining photos below; the saved property details
            are intact.
          </AlertDescription>
        </Alert>
      )}
      <div id="property-photos" className="mb-6 scroll-mt-6">
        <Panel
          title="Property photos"
          description="Upload up to 12 photos. The primary image is used on every listing for this boarding house."
        >
          <BoardingHousePhotoManager
            houseId={house.id}
            photos={photos.filter(
              (photo) => photo.boarding_house_id === house.id
            )}
            editable={house.status !== "suspended"}
          />
        </Panel>
      </div>
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
