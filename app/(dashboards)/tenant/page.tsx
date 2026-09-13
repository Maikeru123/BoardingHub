import { Building2, ClipboardList, KeyRound, MessageSquare } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { DashboardHeader, LinkButton, StatCard } from "@/components/shared"
import { ExploreListings } from "@/components/listings/explore"
export default async function TenantPage() {
  const { profile } = await requireRole("tenant")
  return (
    <>
      <DashboardHeader
        title={`Make yourself at home, ${profile.first_name}.`}
        description="Discover a space for your next chapter."
        action={
          <LinkButton href="/tenant/listings">
            <Building2 className="size-4" />
            Explore boarding houses
          </LinkButton>
        }
      />
      <div className="mb-9 grid gap-5 md:grid-cols-3">
        <StatCard
          title="Rental requests"
          value="Coming soon"
          icon={ClipboardList}
          caption="Your rental requests will appear here."
        />
        <StatCard
          title="Active rental"
          value="Coming soon"
          icon={KeyRound}
          caption="Keep your future rental details in one place."
        />
        <StatCard
          title="Messages"
          value="Coming soon"
          icon={MessageSquare}
          caption="Conversations will be available in a later release."
        />
      </div>
      <h2 className="mb-5 text-lg font-semibold">Available boarding houses</h2>
      <ExploreListings base="/tenant/listings" compact />
    </>
  )
}
