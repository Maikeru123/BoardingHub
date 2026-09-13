import { notFound } from "next/navigation"
import { getListingDetail } from "@/lib/data"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { PublicNavbar } from "@/components/public-navbar"
import { DashboardHeader, LinkButton } from "@/components/shared"
import { ListingDetail } from "@/components/listings/listing-detail"
export default async function PublicListingPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  if (!isSupabaseConfigured()) notFound()
  const { id } = await params
  const detail = await getListingDetail(id)
  return (
    <>
      <PublicNavbar />
      <main id="main-content" className="page-container py-10">
        <DashboardHeader
          title={detail.listing.title}
          description={detail.house.name}
          action={
            <LinkButton href="/listings" variant="outline">
              Back to listings
            </LinkButton>
          }
        />
        <ListingDetail detail={detail} />
      </main>
    </>
  )
}
