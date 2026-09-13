import Link from "next/link"
import {
  ArrowRight,
  BedDouble,
  Building2,
  ClipboardCheck,
  FileText,
  Plus,
  Sparkles,
} from "lucide-react"
import { requireRole } from "@/lib/auth"
import { getOwnerData } from "@/lib/data"
import {
  DashboardHeader,
  LinkButton,
  StatCard,
  Panel,
} from "@/components/shared"
import { ListingTable } from "@/components/management-tables"
export default async function OwnerPage() {
  const { profile } = await requireRole("owner")
  const { houses, rooms, listings, verifications } = await getOwnerData()
  return (
    <>
      <DashboardHeader
        title={`Welcome back, ${profile.first_name}.`}
        description="Here’s what’s happening with your properties."
        action={
          <LinkButton href="/owner/boarding-houses/new">
            <Plus className="size-4" />
            Add boarding house
          </LinkButton>
        }
      />
      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="My boarding houses"
          value={houses.length}
          icon={Building2}
          caption={`${houses.filter((h) => h.status === "active").length} active properties`}
          href="/owner/boarding-houses"
        />
        <StatCard
          title="Rooms"
          value={rooms.length}
          icon={BedDouble}
          caption={`${rooms.filter((r) => r.status === "available").length} marked available`}
          href="/owner/rooms"
        />
        <StatCard
          title="Listings"
          value={listings.length}
          icon={FileText}
          caption={`${listings.filter((l) => l.listing_status === "published").length} published listings`}
          href="/owner/listings"
        />
        <StatCard
          title="Pending verification"
          value={verifications.filter((v) => v.status === "pending").length}
          icon={ClipboardCheck}
          caption="Awaiting administrator review"
          href="/owner/verifications"
        />
      </div>
      <div className="mb-8 flex flex-col justify-between gap-6 overflow-hidden rounded-xl border border-primary/10 bg-primary/5 p-6 sm:flex-row sm:items-center">
        <div className="flex gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-card text-primary">
            <Sparkles className="size-6" />
          </span>
          <div>
            <h2 className="font-semibold">
              Great spaces deserve to be discovered.
            </h2>
            <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
              Add your property details, set up rooms, and create a listing.
              We’ll guide you from your first draft to publication.
            </p>
          </div>
        </div>
        <LinkButton
          href={
            houses.length ? "/owner/listings/new" : "/owner/boarding-houses/new"
          }
          variant="outline"
        >
          {houses.length ? "Create a listing" : "Get started"}
          <ArrowRight className="size-4" />
        </LinkButton>
      </div>
      <div className="grid items-start gap-8 xl:grid-cols-[1fr_290px]">
        <section>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Recent listings</h2>
            <Link
              href="/owner/listings"
              className="text-xs font-medium text-primary"
            >
              View all listings →
            </Link>
          </div>
          <ListingTable listings={listings.slice(0, 5)} houses={houses} />
        </section>
        <Panel
          title="Your path to publication"
          description="A few steps to your first listing"
        >
          <ol className="space-y-6">
            {[
              {
                title: "Add a boarding house",
                text: "Location, amenities, and house rules.",
                href: "/owner/boarding-houses",
                done: houses.length > 0,
              },
              {
                title: "Set up your rooms",
                text: "Room types, prices, and capacity.",
                href: "/owner/rooms",
                done: rooms.length > 0,
              },
              {
                title: "Create your listing",
                text: "A clear title and great photos.",
                href: "/owner/listings",
                done: listings.length > 0,
              },
              {
                title: "Submit for review",
                text: "Our administrators take it from here.",
                href: "/owner/verifications",
                done: verifications.length > 0,
              },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${step.done ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
                >
                  {step.done ? "✓" : i + 1}
                </span>
                <Link href={step.href}>
                  <p className="text-xs font-medium">{step.title}</p>
                  <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                    {step.text}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  )
}
