import { DashboardHeader, Pagination } from "@/components/shared"
import { InquiryList } from "@/components/inquiries/inquiry-list"
import { getInquirySummaries } from "@/lib/data/inquiries"
export const metadata = { title: "Tenant inquiries" }
export default async function OwnerInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page } = await searchParams
  const result = await getInquirySummaries(
    "owner",
    Math.max(1, Number(page) || 1)
  )
  return (
    <>
      <DashboardHeader
        title="Tenant inquiries"
        description="Questions from tenants about your published properties."
      />
      <InquiryList items={result.summaries} role="owner" />
      <Pagination
        page={result.page}
        total={result.total}
        pageSize={30}
        base="/owner/inquiries"
      />
    </>
  )
}
