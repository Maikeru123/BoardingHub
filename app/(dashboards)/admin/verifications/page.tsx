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
  const { listings, verifications } = await getAdminData()
  return (
    <>
      <DashboardHeader
        title="Listing verification"
        description="Inspect submitted properties and help owners publish complete, accurate listings."
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
        verifications={
          view === "all"
            ? verifications
            : verifications.filter((v) => v.status === "pending")
        }
        listings={listings}
      />
    </>
  )
}
