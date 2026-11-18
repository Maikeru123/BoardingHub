import { FeedbackForm } from "@/components/rentals/community-forms"
import { DashboardHeader, Panel } from "@/components/shared"
export default function OwnerFeedbackPage() {
  return (
    <>
      <DashboardHeader
        title="BoardingHub feedback"
        description="Tell us about the platform and your owner workflow."
      />
      <Panel title="Send feedback">
        <FeedbackForm />
      </Panel>
    </>
  )
}
