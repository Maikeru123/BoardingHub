import { notFound } from "next/navigation"
import { getAdminData } from "@/lib/data"
import { DashboardHeader, Panel, StatusBadge } from "@/components/shared"
import { HouseCards } from "@/components/management-tables"
import { ReviewForm } from "@/components/forms/review-form"

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { houses, rooms, photos, listings } = await getAdminData()
  const house = houses.find((item) => item.id === id)
  if (!house) notFound()

  return (
    <>
      <DashboardHeader
        title={house.name}
        description="Review the boarding house details and property photos before allowing room creation."
        action={<StatusBadge status={house.verification_status} />}
      />
      <div className="space-y-6">
        <HouseCards
          houses={[house]}
          rooms={rooms}
          photos={photos}
          listings={listings}
          admin
        />
        {house.verification_status === "pending" && (
          <Panel title="Review this boarding house">
            <ReviewForm houseId={house.id} />
          </Panel>
        )}
      </div>
    </>
  )
}
