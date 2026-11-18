import { RentalRequestDecisionButtons } from "@/components/rentals/rental-request-decision-buttons"
import { DashboardHeader, EmptyState, StatusBadge } from "@/components/shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getRentalRecords } from "@/lib/data/rentals"
import { currency, date, label } from "@/lib/format"
import { calculateInitialPayment } from "@/lib/rental-payment"

export default async function OwnerRentalRequestsPage() {
  const records = await getRentalRecords("owner")
  return (
    <>
      <DashboardHeader
        title="Rental requests"
        description="Review tenant dates, terms, and initial payment estimates."
      />
      {!records.length ? (
        <EmptyState
          title="No rental requests"
          description="New tenant requests will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property / Room</TableHead>
              <TableHead>Rental</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Monthly / Initial</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map(({ request, transaction, room, house, tenant }) => {
              const initial =
                transaction?.initial_payment_amount ??
                calculateInitialPayment(
                  Number(room.monthly_rent),
                  house.current_month_required,
                  house.advance_months_required
                )
              return (
                <TableRow key={request.id}>
                  <TableCell>
                    {tenant
                      ? `${tenant.first_name} ${tenant.last_name}`
                      : "Tenant"}
                  </TableCell>
                  <TableCell>
                    <p>{house.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Room {room.room_number || label(room.room_type)}
                    </p>
                  </TableCell>
                  <TableCell>{label(request.rental_type)}</TableCell>
                  <TableCell>
                    {date(request.move_in_date)}
                    {request.expected_move_out_date && (
                      <>
                        <br />
                        to {date(request.expected_move_out_date)}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {currency(Number(room.monthly_rent))}
                    <br />
                    <span className="text-xs text-muted-foreground">
                      {currency(Number(initial))} initial
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        transaction?.status === "reserved"
                          ? "waiting_for_payment"
                          : transaction?.status || request.status
                      }
                    />
                    {request.status === "rejected" &&
                      request.rejection_reason && (
                        <p className="mt-2 max-w-64 text-xs whitespace-normal text-muted-foreground">
                          {request.rejection_reason}
                        </p>
                      )}
                  </TableCell>
                  <TableCell>
                    {request.status === "pending" && (
                      <RentalRequestDecisionButtons requestId={request.id} />
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
