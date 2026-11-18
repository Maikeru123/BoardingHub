import Link from "next/link"
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
import { displayPaymentStatus } from "@/lib/rental-payment"

export default async function TenantPaymentsPage() {
  const [{ payments, proofUrls }, records] = await Promise.all([
    getPayments("tenant"),
    getRentalRecords("tenant"),
  ])
  const rentals = new Map(
    records.flatMap((record) =>
      record.transaction ? [[record.transaction.id, record] as const] : []
    )
  )
  return (
    <>
      <DashboardHeader
        title="Payments"
        description="Submit payments from a rental and follow every confirmation."
      />
      {!payments.length ? (
        <EmptyState
          title="No payments yet"
          description="Open an approved rental to submit its initial payment."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boarding House / Room</TableHead>
              <TableHead>Type / Period</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Proof</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => {
              const record = rentals.get(payment.rental_transaction_id)
              return (
                <TableRow key={payment.id}>
                  <TableCell>
                    {record ? (
                      <Link
                        className="text-primary"
                        href={`/tenant/rentals/${payment.rental_transaction_id}`}
                      >
                        {record.house.name} /{" "}
                        {record.room.room_number ||
                          label(record.room.room_type)}
                      </Link>
                    ) : (
                      "Rental"
                    )}
                  </TableCell>
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
                  <TableCell>
                    {proofUrls.get(payment.id) ? (
                      <a
                        href={proofUrls.get(payment.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary"
                      >
                        View
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
              )
            })}
          </TableBody>
        </Table>
      )}
    </>
  )
}
