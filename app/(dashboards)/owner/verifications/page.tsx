import { getOwnerData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { VerificationTable } from "@/components/management-tables"
export default async function VerificationsPage() {
  const { houses } = await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="Verification status"
        description="Follow your submissions and see feedback from administrators."
      />
      <VerificationTable
        houses={houses.filter(
          (house) => house.verification_status !== "draft"
        )}
      />
    </>
  )
}
