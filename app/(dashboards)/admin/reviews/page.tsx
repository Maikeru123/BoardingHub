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
import { date } from "@/lib/format"
export default async function AdminReviewsPage() {
  const { reviews } = await getAdminPhaseThree()
  return (
    <>
      <DashboardHeader
        title="Review monitoring"
        description="Verified reviews are tied to completed rental transactions."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{date(item.created_at)}</TableCell>
              <TableCell>{item.rating} / 5</TableCell>
              <TableCell className="max-w-xl whitespace-normal">
                {item.comment || "—"}
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
