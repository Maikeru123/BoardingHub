import { PaymentReviewForm } from "@/components/rentals/lifecycle-forms"
import { DashboardHeader, EmptyState, StatusBadge } from "@/components/shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getPayments, getRentalRecords } from "@/lib/data/rentals"
import { currency, date, label } from "@/lib/format"
import { displayPaymentStatus, getBillingSummary } from "@/lib/rental-payment"

export default async function OwnerPaymentsPage() {
  const [{ payments, proofUrls }, records] = await Promise.all([
    getPayments("owner"),
    getRentalRecords("owner"),
  ])
  const rentals = new Map(
    records.flatMap((record) =>
      record.transaction ? [[record.transaction.id, record] as const] : []
    )
  )
  const dueRecords = records
    .filter(
      (record) =>
        record.transaction &&
        ["reserved", "active", "ending"].includes(record.transaction.status)
    )
    .map((record) => ({
      record,
      billing: getBillingSummary(record.transaction!, payments),
    }))
  return (
    <>
      <DashboardHeader
        title="Tenant payments"
        description="See what is paid, pending, due, or overdue, then review submitted Cash and GCash payments."
      />
      <h2 className="mb-4 text-lg font-semibold">Payment due overview</h2>
      {dueRecords.length ? (
        <div className="mb-9 overflow-hidden rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Property / Room</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Billing State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dueRecords.map(({ record, billing }) => (
                <TableRow key={record.transaction!.id}>
                  <TableCell>
                    {record.tenant
                      ? `${record.tenant.first_name} ${record.tenant.last_name}`
                      : "Tenant"}
                  </TableCell>
                  <TableCell>
                    {record.house.name}
                    <p className="text-xs text-muted-foreground">
                      Room{" "}
                      {record.room.room_number || label(record.room.room_type)}
                    </p>
                  </TableCell>
                  <TableCell>{date(billing.nextPaymentDue)}</TableCell>
                  <TableCell>{currency(billing.amountDue)}</TableCell>
                  <TableCell>
                    <StatusBadge status={billing.state} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="mb-9 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No current tenant payment schedules.
        </p>
      )}
      <h2 className="mb-4 text-lg font-semibold">Submitted payments</h2>
      {!payments.length ? (
        <EmptyState
          title="No submitted payments"
          description="Tenant initial and monthly payments will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant / Property</TableHead>
              <TableHead>Billing Period / Due Date</TableHead>
              <TableHead>Amount Due</TableHead>
              <TableHead>Method / Reference</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Payment Status</TableHead>
              <TableHead>Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const record = rentals.get(payment.rental_transaction_id)
              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    {record?.tenant
                      ? `${record.tenant.first_name} ${record.tenant.last_name}`
                      : "Tenant"}
                    <p className="text-xs text-muted-foreground">
                      {record?.house.name} · Room{" "}
                      {record?.room.room_number ||
                        (record ? label(record.room.room_type) : "")}
                    </p>
                  </TableCell>
                  <TableCell>
                    {label(payment.payment_type)}
                    <p className="text-xs text-muted-foreground">
                      Due{" "}
                      {date(
                        payment.billing_period_start ||
                          record?.transaction?.start_date ||
                          null
                      )}
                    </p>
                    {payment.billing_period_start && (
                      <p className="text-xs">
                        {date(payment.billing_period_start)} –{" "}
                        {date(payment.billing_period_end)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{currency(Number(payment.amount))}</TableCell>
                  <TableCell>
                    {label(payment.payment_method)}
                    <p className="text-xs">
                      {payment.reference_number || "No reference"}
                    </p>
                  </TableCell>
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
                  <TableCell>{date(payment.payment_date)}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={displayPaymentStatus(payment.payment_status)}
                    />
                    {payment.remarks && (
                      <p className="mt-1 max-w-48 text-xs whitespace-normal">
                        {payment.remarks}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment.payment_status === "pending" && (
                      <PaymentReviewForm paymentId={payment.id} />
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </>
  )
}
