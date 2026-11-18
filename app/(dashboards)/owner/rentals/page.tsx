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
import { getRentalRecords } from "@/lib/data/rentals"
import { currency, date, label } from "@/lib/format"

export default async function OwnerRentalsPage() {
  const records = (await getRentalRecords("owner")).filter(
    (record) => record.transaction
  )
  return (
    <>
      <DashboardHeader
        title="Rental transactions"
        description="Manage rentals waiting for payment, active stays, move-outs, and completed stays."
      />
      {!records.length ? (
        <EmptyState
          title="No rental transactions"
          description="An approved rental request creates a transaction."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Property / Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => {
              const rental = record.transaction!
              return (
                <TableRow key={rental.id}>
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
                  <TableCell>{label(rental.rental_type)}</TableCell>
                  <TableCell>
                    {date(rental.start_date)}
                    <br />
                    {rental.expected_end_date
                      ? date(rental.expected_end_date)
                      : "No expected end"}
                  </TableCell>
                  <TableCell>{currency(Number(rental.monthly_rent))}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={
                        rental.status === "reserved"
                          ? "waiting_for_payment"
                          : rental.status
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/owner/rentals/${rental.id}`}
                      className="text-primary"
                    >
                      Manage
                    </Link>
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
