import Link from "next/link"
import {
  ArrowRight,
  BedDouble,
  Building2,
  ClipboardCheck,
  FileText,
  Plus,
  Sparkles,
  MessageSquare,
  MailOpen,
  KeyRound,
  CreditCard,
} from "lucide-react"
import { requireRole } from "@/lib/auth"
import { getOwnerData } from "@/lib/data"
import { getInquiryStats, getInquirySummaries } from "@/lib/data/inquiries"
import { getPayments, getRentalRecords } from "@/lib/data/rentals"
import {
  DashboardHeader,
  LinkButton,
  StatCard,
  Panel,
} from "@/components/shared"
import { ListingTable } from "@/components/management-tables"
import { InquiryList } from "@/components/inquiries/inquiry-list"
export default async function OwnerPage() {
  const { profile } = await requireRole("owner")
  const [
    { houses, rooms, listings },
    inquiryStats,
    inquiryList,
    rentalRecords,
    paymentData,
  ] = await Promise.all([
    getOwnerData(),
    getInquiryStats("owner"),
    getInquirySummaries("owner"),
    getRentalRecords("owner"),
    getPayments("owner"),
  ])
  const activeHouses = houses.filter((house) => house.status === "active")
  const activeHouseIds = new Set(activeHouses.map((house) => house.id))
  const activeRooms = rooms.filter(
    (room) =>
      room.status !== "archived" && activeHouseIds.has(room.boarding_house_id)
  )
  const activeListings = listings.filter((listing) =>
    activeHouseIds.has(listing.boarding_house_id)
  )
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
          value={activeHouses.length}
          icon={Building2}
          caption={`${houses.filter((h) => h.status === "active").length} active properties`}
          href="/owner/boarding-houses"
        />
        <StatCard
          title="Rooms"
          value={activeRooms.length}
          icon={BedDouble}
          caption={`${activeRooms.filter((r) => r.status === "available").length} marked available`}
          href="/owner/rooms"
        />
        <StatCard
          title="Available rooms"
          value={
            activeRooms.filter((room) => room.status === "available").length
          }
          icon={BedDouble}
          caption="General room status"
          href="/owner/rooms"
        />
        <StatCard
          title="Published listings"
          value={
            activeListings.filter(
              (listing) => listing.listing_status === "published"
            )
              .length
          }
          icon={FileText}
          caption={`${activeListings.length} total listings`}
          href="/owner/listings"
        />
        <StatCard
          title="Open inquiries"
          value={inquiryStats.open}
          icon={MessageSquare}
          caption="Active tenant conversations"
          href="/owner/inquiries"
        />
        <StatCard
          title="Pending rental requests"
          value={
            rentalRecords.filter((item) => item.request.status === "pending")
              .length
          }
          icon={KeyRound}
          caption={`${rentalRecords.filter((item) => item.transaction?.status === "active").length} active rentals`}
          href="/owner/rental-requests"
        />
        <StatCard
          title="Payments to review"
          value={
            paymentData.payments.filter(
              (item) => item.payment_status === "pending"
            ).length
          }
          icon={CreditCard}
          caption="Tenant submissions awaiting confirmation"
          href="/owner/payments"
        />
        <StatCard
          title="Unread messages"
          value={inquiryStats.unread}
          icon={MailOpen}
          caption="Waiting for your reply"
          href="/owner/inquiries"
        />
        <StatCard
          title="Pending verification"
          value={
            activeHouses.filter(
              (house) => house.verification_status === "pending"
            ).length
          }
          icon={ClipboardCheck}
          caption="Awaiting administrator review"
          href="/owner/verifications"
        />
      </div>
      {inquiryList.summaries.length > 0 && (
        <section className="mb-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-semibold">Recent inquiries</h2>
            <Link
              href="/owner/inquiries"
              className="text-xs font-medium text-primary"
            >
              View all inquiries →
            </Link>
          </div>
          <InquiryList items={inquiryList.summaries.slice(0, 3)} role="owner" />
        </section>
      )}
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
              Add property details and photos, verify the boarding house, then
              set up rooms and publish a listing.
            </p>
          </div>
        </div>
        <LinkButton
          href={
            activeHouses.some(
              (house) => house.verification_status === "approved"
            )
              ? "/owner/rooms/new"
              : "/owner/boarding-houses"
          }
          variant="outline"
        >
          {houses.length ? "Continue setup" : "Get started"}
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
          <ListingTable
            listings={activeListings.slice(0, 5)}
            houses={activeHouses}
          />
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
                title: "Verify the boarding house",
                text: "Submit property details and photos for review.",
                href: "/owner/verifications",
                done: activeHouses.some(
                  (house) => house.verification_status === "approved"
                ),
              },
              {
                title: "Set up your rooms",
                text: "Room types, prices, and capacity.",
                href: "/owner/rooms",
                done: activeRooms.length > 0,
              },
              {
                title: "Publish a listing",
                text: "Introduce the approved property to tenants.",
                href: "/owner/listings",
                done: activeListings.some(
                  (listing) => listing.listing_status === "published"
                ),
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
