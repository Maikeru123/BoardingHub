import {
  Building2,
  ClipboardCheck,
  FileText,
  Users,
  UserRoundCheck,
} from "lucide-react"
import { getAdminData } from "@/lib/data"
import { DashboardHeader, LinkButton, StatCard } from "@/components/shared"
import { VerificationTable } from "@/components/management-tables"
export default async function AdminPage() {
  const { counts, listings, verifications } = await getAdminData()
  return (
    <>
      <DashboardHeader
        title="Administration overview"
        description="Keep an eye on the community and help quality listings find their place."
        action={
          <LinkButton href="/admin/verifications">
            Review submissions
          </LinkButton>
        }
      />
      <div className="mb-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            title: "Total users",
            icon: Users,
            caption: "Registered community members",
            href: "/admin/users",
          },
          {
            title: "Property owners",
            icon: UserRoundCheck,
            caption: "Registered owner accounts",
            href: "/admin/users",
          },
          {
            title: "Boarding houses",
            icon: Building2,
            caption: "Properties on BoardingHub",
            href: "/admin/boarding-houses",
          },
          {
            title: "Pending verification",
            icon: ClipboardCheck,
            caption: "Ready for your review",
            href: "/admin/verifications",
          },
          {
            title: "Published listings",
            icon: FileText,
            caption: "Approved for publication",
            href: "/admin/listings",
          },
        ].map((stat, i) => (
          <StatCard key={stat.title} {...stat} value={counts[i]} />
        ))}
      </div>
      <h2 className="mb-5 text-lg font-semibold">Awaiting your review</h2>
      <VerificationTable
        admin
        verifications={verifications
          .filter((v) => v.status === "pending")
          .slice(0, 10)}
        listings={listings}
      />
    </>
  )
}
