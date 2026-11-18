import Link from "next/link"
import { CancelApprovedRentalButton } from "@/components/rentals/cancel-approved-rental-button"
import { CancelRentalRequestButton } from "@/components/rentals/cancel-rental-request-button"
import {
  DashboardHeader,
  EmptyState,
  LinkButton,
  StatusBadge,
} from "@/components/shared"
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

export default async function TenantRentalsPage() {
  const records = await getRentalRecords("tenant")
  return (
    <>
      <DashboardHeader
        title="My rentals"
        description="Track requests, payments, active stays, and rental history."
        action={<LinkButton href="/boarding-houses">Find a room</LinkButton>}
      />
      {!records.length ? (
        <EmptyState
          title="No rentals yet"
          description="Choose a room to submit your first rental request."
          action={
            <LinkButton href="/boarding-houses">
              Explore boarding houses
            </LinkButton>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Boarding House</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Rental Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Monthly Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map(({ request, transaction, room, house }) => (
              <TableRow key={request.id}>
                <TableCell>{house.name}</TableCell>
                <TableCell>
                  {room.room_number || label(room.room_type)}
                </TableCell>
                <TableCell>{label(request.rental_type)}</TableCell>
                <TableCell>
                  {date(request.move_in_date)}
                  {request.expected_move_out_date && (
                    <> – {date(request.expected_move_out_date)}</>
                  )}
                </TableCell>
                <TableCell>{currency(Number(room.monthly_rent))}</TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      transaction?.status === "reserved"
                        ? "payment_required"
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
                  {transaction?.status === "reserved" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        className="text-sm font-medium text-primary"
                        href={`/tenant/rentals/${transaction.id}`}
                      >
                        Pay rent
                      </Link>
                      <CancelApprovedRentalButton rentalId={transaction.id} />
                    </div>
                  ) : transaction ? (
                    <Link
                      className="text-sm font-medium text-primary"
                      href={`/tenant/rentals/${transaction.id}`}
                    >
                      View rental
                    </Link>
                  ) : request.status === "pending" ? (
                    <CancelRentalRequestButton requestId={request.id} />
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
