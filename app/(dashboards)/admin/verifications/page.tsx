import Link from "next/link"
import { getAdminData } from "@/lib/data"
import { DashboardHeader } from "@/components/shared"
import { VerificationTable } from "@/components/management-tables"
export default async function AdminVerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const { view } = await searchParams
  const { houses } = await getAdminData()
  return (
    <>
      <DashboardHeader
        title="Boarding house verification"
        description="Review property details and photos before owners can add rooms."
      />
      <nav
        aria-label="Verification filter"
        className="mb-6 flex gap-6 border-b pb-3 text-sm"
      >
        <Link
          href="/admin/verifications"
          className={
            view !== "all"
              ? "font-semibold text-primary"
              : "text-muted-foreground"
          }
        >
          Pending review
        </Link>
        <Link
          href="/admin/verifications?view=all"
          className={
            view === "all"
              ? "font-semibold text-primary"
              : "text-muted-foreground"
          }
        >
          All submissions
        </Link>
      </nav>
      <VerificationTable
        admin
        houses={
          view === "all"
            ? houses
            : houses.filter((house) => house.verification_status === "pending")
        }
      />
    </>
  )
}
