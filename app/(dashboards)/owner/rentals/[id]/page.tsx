import { DashboardHeader, Panel, StatusBadge } from "@/components/shared"
import { cancelRentalTransaction } from "@/actions/rentals"
import { ActionButton } from "@/components/action-button"
import { RentalEndForm } from "@/components/rentals/lifecycle-forms"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPaymentsForRental, getRentalRecord } from "@/lib/data/rentals"
import { currency, date, label } from "@/lib/format"
import { displayPaymentStatus } from "@/lib/rental-payment"

export default async function OwnerRentalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const record = await getRentalRecord(id, "owner")
  const { payments, proofUrls } = await getPaymentsForRental(id, "owner")
  const rental = record.transaction!
  return (
    <>
      <DashboardHeader
        title={`${record.house.name} rental`}
        description={`${record.tenant ? `${record.tenant.first_name} ${record.tenant.last_name}` : "Tenant"} · Room ${record.room.room_number || label(record.room.room_type)}`}
        action={
          <div className="flex items-center gap-3">
            <StatusBadge
              status={
                rental.status === "reserved"
                  ? "waiting_for_payment"
                  : rental.status
              }
            />
            {rental.status === "reserved" && (
              <ActionButton
                action={() => cancelRentalTransaction(rental.id)}
                variant="destructive"
                confirmation="Cancel this rental while it is waiting for payment? A confirmed payment prevents cancellation."
              >
                Cancel rental
              </ActionButton>
            )}
          </div>
        }
      />
      <div className="space-y-6">
        <Panel title="Rental details">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Rental Type</dt>
              <dd>{label(rental.rental_type)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Monthly Rent</dt>
              <dd>{currency(Number(rental.monthly_rent))}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Initial Payment</dt>
              <dd>{currency(Number(rental.initial_payment_amount))}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Start Date</dt>
              <dd>{date(rental.start_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Expected End</dt>
              <dd>
                {rental.expected_end_date
                  ? date(rental.expected_end_date)
                  : "No expected move-out date"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Actual End</dt>
              <dd>{date(rental.actual_end_date)}</dd>
            </div>
          </dl>
        </Panel>
        {["reserved", "active", "ending"].includes(rental.status) && (
          <Panel title="Ending and move-out">
            <RentalEndForm
              rentalId={rental.id}
              ending={rental.status === "ending"}
            />
          </Panel>
        )}
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
                        <p className="text-xs">
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
                          href={proofUrls.get(payment.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary"
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No payments submitted.
            </p>
          )}
        </Panel>
      </div>
    </>
  )
}
