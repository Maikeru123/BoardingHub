import { PublicNavbar } from "@/components/public-navbar"
import { DashboardHeader } from "@/components/shared"
import { ExploreListings } from "@/components/listings/explore"
export const metadata = { title: "Explore boarding houses" }
export const dynamic = "force-dynamic"
export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const params = await searchParams
  return (
    <>
      <PublicNavbar />
      <main id="main-content" className="page-container py-12">
        <DashboardHeader
          title="Find your next place."
          description="Explore reviewed boarding houses and find a space that fits your next chapter."
        />
        <ExploreListings
          search={params.q}
          page={Math.max(1, Number(params.page) || 1)}
        />
      </main>
    </>
  )
}
