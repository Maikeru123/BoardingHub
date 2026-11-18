import { DashboardHeader, Pagination } from "@/components/shared"
import { InquiryList } from "@/components/inquiries/inquiry-list"
import { getInquirySummaries } from "@/lib/data/inquiries"
export const metadata = { title: "My inquiries" }
export default async function TenantInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const result = await getInquirySummaries(
    "tenant",
    Math.max(1, Number(page) || 1)
  )
  return (
    <>
      <DashboardHeader
        title="My inquiries"
        description="Your private conversations with property owners."
      />
      <InquiryList items={result.summaries} role="tenant" />
      <Pagination
        page={result.page}
        total={result.total}
        pageSize={30}
        base="/tenant/inquiries"
      />
    </>
  )
}
