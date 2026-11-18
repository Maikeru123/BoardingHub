import { DashboardHeader, StatusBadge } from "@/components/shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAdminPhaseThree } from "@/lib/data/rentals"
import { currency, date, label } from "@/lib/format"
export default async function AdminPaymentsPage() {
  const { payments } = await getAdminPhaseThree()
  return (
    <>
      <DashboardHeader
        title="Payment monitoring"
        description="Read-only oversight of submitted and confirmed rental payments."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Billing Period</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{date(item.payment_date)}</TableCell>
              <TableCell>{label(item.payment_type)}</TableCell>
              <TableCell>
                {item.billing_period_start
                  ? `${date(item.billing_period_start)} – ${date(item.billing_period_end)}`
                  : "—"}
              </TableCell>
              <TableCell>{currency(Number(item.amount))}</TableCell>
              <TableCell>{label(item.payment_method)}</TableCell>
              <TableCell>
                <StatusBadge status={item.payment_status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
