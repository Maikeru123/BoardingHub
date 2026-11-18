import {
  Building2,
  ClipboardCheck,
  FileText,
  Users,
  UserRoundCheck,
  KeyRound,
  CreditCard,
  Flag,
  MessageSquareText,
} from "lucide-react"
import { getAdminData } from "@/lib/data"
import { getAdminPhaseThree } from "@/lib/data/rentals"
import { DashboardHeader, LinkButton, StatCard } from "@/components/shared"
import { VerificationTable } from "@/components/management-tables"
export default async function AdminPage() {
  const [{ counts, houses }, phaseThree] = await Promise.all([
    getAdminData(),
    getAdminPhaseThree(),
  ])
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
      <div className="mb-9 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Rental transactions"
          value={phaseThree.transactions.length}
          icon={KeyRound}
          caption={`${phaseThree.transactions.filter((item) => item.status === "active").length} active · ${phaseThree.transactions.filter((item) => item.status === "ending").length} ending`}
          href="/admin/rentals"
        />
        <StatCard
          title="Payments"
          value={phaseThree.payments.length}
          icon={CreditCard}
          caption={`${phaseThree.payments.filter((item) => item.payment_status === "pending").length} pending confirmation`}
          href="/admin/payments"
        />
        <StatCard
          title="Reports"
          value={phaseThree.listingReports.length}
          icon={Flag}
          caption={`${phaseThree.listingReports.filter((item) => item.status === "pending").length} pending review`}
          href="/admin/reports"
        />
        <StatCard
          title="Feedback"
          value={phaseThree.feedback.length}
          icon={MessageSquareText}
          caption={`${phaseThree.reviews.length} property reviews`}
          href="/admin/feedback"
        />
      </div>
      <h2 className="mb-5 text-lg font-semibold">Awaiting your review</h2>
      <VerificationTable
        admin
        houses={houses
          .filter((house) => house.verification_status === "pending")
          .slice(0, 10)}
      />
    </>
  )
}
