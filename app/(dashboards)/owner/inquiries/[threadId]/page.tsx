import { requireRole } from "@/lib/auth"
import { getInquiryDetail } from "@/lib/data/inquiries"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { Conversation } from "@/components/inquiries/conversation"
export default async function OwnerInquiryPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  const [{ user }, detail] = await Promise.all([
    requireRole("owner"),
    getInquiryDetail(threadId, "owner"),
  ])
  return (
    <>
      <DashboardHeader
        title={
          detail.otherParticipant
            ? `${detail.otherParticipant.first_name} ${detail.otherParticipant.last_name}`
            : "Tenant inquiry"
        }
        description={`${detail.house.name} · ${detail.listing.title}`}
        action={
          <LinkButton href="/owner/inquiries" variant="outline">
            Back to inquiries
          </LinkButton>
        }
      />
      <Conversation detail={detail} role="owner" userId={user.id} />
    </>
  )
}
