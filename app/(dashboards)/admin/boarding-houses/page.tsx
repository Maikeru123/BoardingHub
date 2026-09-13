import { getAdminData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { HouseCards } from "@/components/management-tables"
export default async function AdminHousesPage() {
  const { houses } = await getAdminData()
  return (
    <>
      <DashboardHeader
        title="Boarding houses"
        description="An overview of properties registered on BoardingHub."
      />
      <HouseCards houses={houses} admin />
    </>
  )
}
