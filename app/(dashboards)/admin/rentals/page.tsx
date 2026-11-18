import { DashboardHeader, StatCard, StatusBadge } from "@/components/shared"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getAdminPhaseThree } from "@/lib/data/rentals"
import { date, label } from "@/lib/format"
import { CalendarRange, CheckCircle2, Clock3, KeyRound } from "lucide-react"
export default async function AdminRentalsPage() {
  const data = await getAdminPhaseThree()
  const items = data.transactions
  return (
    <>
      <DashboardHeader
        title="Rental monitoring"
        description="Monitor the owner and tenant workflow without replacing it."
      />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Requests"
          value={data.requests.length}
          icon={Clock3}
          caption="All rental requests"
        />
        <StatCard
          title="Open-ended"
          value={items.filter((x) => x.rental_type === "open_ended").length}
          icon={KeyRound}
          caption="Long-term rentals"
        />
        <StatCard
          title="Fixed-term"
          value={items.filter((x) => x.rental_type === "fixed_term").length}
          icon={CalendarRange}
          caption="Dated rentals"
        />
        <StatCard
          title="Completed"
          value={items.filter((x) => x.status === "completed").length}
          icon={CheckCircle2}
          caption="Finished rentals"
        />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rental</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">{item.id}</TableCell>
              <TableCell>{label(item.rental_type)}</TableCell>
              <TableCell>
                {date(item.start_date)} –{" "}
                {item.expected_end_date
                  ? date(item.expected_end_date)
                  : "No expected end"}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
