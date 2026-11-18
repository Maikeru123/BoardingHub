import { moderateFeedback } from "@/actions/rentals"
import { ActionButton } from "@/components/action-button"
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
export default async function AdminFeedbackPage() {
  const { feedback } = await getAdminPhaseThree()
  return (
    <>
      <DashboardHeader
        title="BoardingHub feedback"
        description="Platform feedback is kept separate from property reviews."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feedback.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{date(item.date_submitted)}</TableCell>
              <TableCell>{item.subject}</TableCell>
              <TableCell className="max-w-xl whitespace-normal">
                {item.message}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {item.status === "pending" && (
                    <ActionButton
                      action={() => moderateFeedback(item.id, "under_review")}
                    >
                      Review
                    </ActionButton>
                  )}
                  <ActionButton
                    action={() => moderateFeedback(item.id, "resolved")}
                  >
                    Resolve
                  </ActionButton>
                  <ActionButton
                    action={() => moderateFeedback(item.id, "dismissed")}
                    variant="outline"
                  >
                    Dismiss
                  </ActionButton>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  )
}
