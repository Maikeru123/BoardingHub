import { getPublicSessionProfile } from "@/lib/auth"
import { getBoardingHouseDetail } from "@/lib/data/boarding-houses"
import { getPublicReviews } from "@/lib/data/rentals"
import { PublicNavbar } from "@/components/public-navbar"
import { DashboardHeader, LinkButton, Panel } from "@/components/shared"
import { PropertyDetail } from "@/components/discovery/property-detail"
import type { Role } from "@/types/domain"
export const dynamic = "force-dynamic"
export default async function BoardingHousePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [detail, session, reviewSummary] = await Promise.all([
    getBoardingHouseDetail(id),
    getPublicSessionProfile(),
    getPublicReviews(id),
  ])
  return (
    <>
      <PublicNavbar />
      <main id="main-content" className="page-container py-10">
        <DashboardHeader
          title={detail.house.name}
          description={[
            detail.house.barangay,
            detail.house.city_municipality,
            detail.house.province,
          ]
            .filter(Boolean)
            .join(", ")}
          action={
            <LinkButton href="/boarding-houses" variant="outline">
              Back to discovery
            </LinkButton>
          }
        />
        <PropertyDetail
          detail={detail}
          viewerRole={session?.profile.role as Role | undefined}
          viewerId={session?.user.id}
        />
        <div className="mt-8">
          <Panel
            title={
              reviewSummary.reviews.length
                ? `${reviewSummary.average.toFixed(1)} / 5 average rating`
                : "Guest reviews"
            }
            description={`${reviewSummary.reviews.length} verified rental review${reviewSummary.reviews.length === 1 ? "" : "s"}`}
          >
            {reviewSummary.reviews.length ? (
              <div className="space-y-5">
                {reviewSummary.reviews.map((review) => (
                  <article
                    key={review.id}
                    className="border-b pb-5 last:border-0 last:pb-0"
                  >
                    <p className="font-medium">
                      {"★".repeat(review.rating)}
                      <span className="text-muted-foreground">
                        {"★".repeat(5 - review.rating)}
                      </span>
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {review.comment || "No written comment."}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed-stay reviews yet.
              </p>
            )}
          </Panel>
        </div>
      </main>
    </>
  )
}
