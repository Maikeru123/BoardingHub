import { requireRole } from "@/lib/auth"
import { getInquiryDetail } from "@/lib/data/inquiries"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { Conversation } from "@/components/inquiries/conversation"
export default async function TenantInquiryPage({
  params,
}: {
  params: Promise<{ threadId: string }>
}) {
  const { threadId } = await params
  const [{ user }, detail] = await Promise.all([
    requireRole("tenant"),
    getInquiryDetail(threadId, "tenant"),
  ])
  return (
    <>
      <DashboardHeader
        title={detail.house.name}
        description="Conversation with the property owner"
        action={
          <LinkButton href="/tenant/inquiries" variant="outline">
            Back to inquiries
          </LinkButton>
        }
      />
      <Conversation detail={detail} role="tenant" userId={user.id} />
    </>
  )
}
