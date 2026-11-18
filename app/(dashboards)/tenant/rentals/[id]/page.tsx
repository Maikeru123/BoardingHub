import { DashboardHeader, Panel, StatusBadge } from "@/components/shared"
import { CancelApprovedRentalButton } from "@/components/rentals/cancel-approved-rental-button"
import { PaymentForm } from "@/components/rentals/payment-form"
import { PropertyReviewForm } from "@/components/rentals/lifecycle-forms"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getPaymentsForRental,
  getRentalRecord,
  getReviewForRental,
} from "@/lib/data/rentals"
import { currency, date, label } from "@/lib/format"
import { displayPaymentStatus, getBillingSummary } from "@/lib/rental-payment"

export default async function TenantRentalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const record = await getRentalRecord(id, "tenant")
  const [{ payments, proofUrls }, existingReview] = await Promise.all([
    getPaymentsForRental(id, "tenant"),
    getReviewForRental(id),
  ])
  const rental = record.transaction!
  const billing = getBillingSummary(rental, payments)
  return (
    <>
      <DashboardHeader
        title={record.house.name}
        description={`Room ${record.room.room_number || label(record.room.room_type)} rental`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge
              status={
                rental.status === "reserved"
                  ? "payment_required"
                  : rental.status
              }
            />
            {rental.status === "reserved" && (
              <CancelApprovedRentalButton rentalId={rental.id} />
            )}
          </div>
        }
      />
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Rental details">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Rental Type</dt>
                <dd>{label(rental.rental_type)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Monthly Rent</dt>
                <dd>{currency(Number(rental.monthly_rent))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Move-in</dt>
                <dd>{date(rental.start_date)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expected Move-out</dt>
                <dd>
                  {rental.expected_end_date
                    ? date(rental.expected_end_date)
                    : "No expected move-out date"}
                </dd>
              </div>
            </dl>
          </Panel>
          <Panel title="Monthly payment schedule">
            <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Monthly Rent</dt>
                <dd className="font-medium">
                  {currency(Number(rental.monthly_rent))}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last Payment</dt>
                <dd className="font-medium">
                  {billing.lastPaidPayment
                    ? `${date(billing.lastPaidPayment.payment_date)} — Paid`
                    : "No confirmed payment yet"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Next Payment Due</dt>
                <dd className="font-medium">{date(billing.nextPaymentDue)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Amount Due</dt>
                <dd className="font-medium">{currency(billing.amountDue)}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <StatusBadge status={billing.state} />
            </div>
          </Panel>
          <Panel title="Payment history">
            {payments.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type / Period</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Proof</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {label(payment.payment_type)}
                        {payment.billing_period_start && (
                          <p className="text-xs text-muted-foreground">
                            {date(payment.billing_period_start)} –{" "}
                            {date(payment.billing_period_end)}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{currency(Number(payment.amount))}</TableCell>
                      <TableCell>{label(payment.payment_method)}</TableCell>
                      <TableCell>{payment.reference_number || "—"}</TableCell>
                      <TableCell>
                        {proofUrls.get(payment.id) ? (
                          <a
                            className="text-primary"
                            href={proofUrls.get(payment.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View proof
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={displayPaymentStatus(payment.payment_status)}
                        />
                        {payment.remarks && (
                          <p className="mt-1 max-w-56 text-xs whitespace-normal text-muted-foreground">
                            {payment.remarks}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payments submitted yet.
              </p>
            )}
          </Panel>
          {rental.status === "completed" && (
            <Panel title="Review your stay">
              {existingReview ? (
                <p className="text-sm">
                  Your {existingReview.rating}-star review has been published.
                </p>
              ) : (
                <PropertyReviewForm rentalId={rental.id} />
              )}
            </Panel>
          )}
        </div>
        {billing.state === "pending_review" ? (
          <Panel title="Payment pending review">
            <StatusBadge status="pending_review" />
            <p className="mt-3 text-sm text-muted-foreground">
              The property owner is reviewing your submitted payment. Another
              payment cannot be submitted for this billing period.
            </p>
          </Panel>
        ) : rental.status === "reserved" &&
          billing.paymentType === "monthly" ? (
          <Panel title="Payment confirmed">
            <p className="text-sm text-muted-foreground">
              Your initial payment is confirmed. Monthly payments become
              available when the rental reaches its start date and becomes
              active.
            </p>
          </Panel>
        ) : ["reserved", "active", "ending"].includes(rental.status) ? (
          <Panel title="Submit a payment">
            <PaymentForm rental={rental} summary={billing} />
          </Panel>
        ) : null}
      </div>
    </>
  )
}
