import { Building2, ClipboardList, KeyRound, MessageSquare } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { getBoardingHouses } from "@/lib/data/boarding-houses"
import { getInquiryStats } from "@/lib/data/inquiries"
import { getPayments, getRentalRecords } from "@/lib/data/rentals"
import {
  DashboardHeader,
  LinkButton,
  Panel,
  StatCard,
  StatusBadge,
} from "@/components/shared"
import { BoardingHouseCard } from "@/components/discovery/boarding-house-card"
import { getBillingSummary } from "@/lib/rental-payment"
import { currency, date, label } from "@/lib/format"
export default async function TenantPage() {
  const { profile } = await requireRole("tenant")
  const [discovery, inquiryStats, rentals, { payments }] = await Promise.all([
    getBoardingHouses({}),
    getInquiryStats("tenant"),
    getRentalRecords("tenant"),
    getPayments("tenant"),
  ])
  const currentRental = rentals.find((item) =>
    ["active", "ending"].includes(item.transaction?.status || "")
  )
  const billing = currentRental?.transaction
    ? getBillingSummary(currentRental.transaction, payments)
    : null
  return (
    <>
      <DashboardHeader
        title={`Make yourself at home, ${profile.first_name}.`}
        description="Discover a space for your next chapter."
        action={
          <LinkButton href="/boarding-houses">
            <Building2 className="size-4" />
            Explore boarding houses
          </LinkButton>
        }
      />
      <div className="mb-9 grid gap-5 md:grid-cols-3">
        <StatCard
          title="Rental requests"
          value={
            rentals.filter((item) => item.request.status === "pending").length
          }
          icon={ClipboardList}
          caption="Awaiting an owner decision"
          href="/tenant/rentals"
        />
        <StatCard
          title="My inquiries"
          value={inquiryStats.open}
          icon={MessageSquare}
          caption={`${inquiryStats.unread} unread messages`}
          href="/tenant/inquiries"
        />
        <StatCard
          title="Rental history"
          value={
            rentals.filter((item) => item.transaction?.status === "completed")
              .length
          }
          icon={KeyRound}
          caption={`${rentals.filter((item) => item.transaction && ["reserved", "active", "ending"].includes(item.transaction.status)).length} current rentals`}
          href="/tenant/rentals"
        />
      </div>
      {currentRental?.transaction && billing && (
        <div className="mb-9">
          <Panel title="My Current Rental">
            <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Boarding House</p>
                <p className="mt-1 font-medium">{currentRental.house.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Room</p>
                <p className="mt-1 font-medium">
                  {currentRental.room.room_number ||
                    label(currentRental.room.room_type)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monthly Rent</p>
                <p className="mt-1 font-medium">
                  {currency(Number(currentRental.transaction.monthly_rent))}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rental Type</p>
                <p className="mt-1 font-medium">
                  {label(currentRental.transaction.rental_type)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Rental Start</p>
                <p className="mt-1 font-medium">
                  {date(currentRental.transaction.start_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Next Payment Due
                </p>
                <p className="mt-1 font-medium">
                  {date(billing.nextPaymentDue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Amount Due</p>
                <p className="mt-1 font-medium">
                  {currency(billing.amountDue)}
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Latest Payment Status
                </span>
                <StatusBadge status={billing.state} />
              </div>
              {billing.state !== "pending_review" && (
                <LinkButton
                  href={`/tenant/rentals/${currentRental.transaction.id}`}
                >
                  {billing.state === "paid"
                    ? "View Payment Schedule"
                    : "Pay Now"}
                </LinkButton>
              )}
            </div>
          </Panel>
        </div>
      )}
      <h2 className="mb-5 text-lg font-semibold">Available boarding houses</h2>
      {discovery.items.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {discovery.items.slice(0, 3).map((item) => (
            <BoardingHouseCard key={item.house_id} item={item} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          No published boarding houses yet.
        </p>
      )}
    </>
  )
}
