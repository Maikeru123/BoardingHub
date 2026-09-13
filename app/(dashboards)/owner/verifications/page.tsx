import { getOwnerData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { VerificationTable } from "@/components/management-tables"
export default async function VerificationsPage() {
  const { listings, verifications } = await getOwnerData()
  return (
    <>
      <DashboardHeader
        title="Verification status"
        description="Follow your submissions and see feedback from administrators."
      />
      <VerificationTable verifications={verifications} listings={listings} />
    </>
  )
}
