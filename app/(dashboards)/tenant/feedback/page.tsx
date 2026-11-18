import { FeedbackForm } from "@/components/rentals/community-forms"
import { DashboardHeader, Panel } from "@/components/shared"
export default function TenantFeedbackPage() {
  return (
    <>
      <DashboardHeader
        title="BoardingHub feedback"
        description="Tell us about the platform, separate from reviews of a stay."
      />
      <Panel title="Send feedback">
        <FeedbackForm />
      </Panel>
    </>
  )
}
