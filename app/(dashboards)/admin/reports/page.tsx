import { moderateReport } from "@/actions/rentals"
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
export default async function AdminReportsPage() {
  const { listingReports, listings } = await getAdminPhaseThree()
  return (
    <>
      <DashboardHeader
        title="Listing reports"
        description="Review reports, resolve or dismiss them, and suspend unsafe listings."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date / Listing</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listingReports.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                {date(item.date_reported)}
                <p className="text-xs text-muted-foreground">
                  {listings.find((x) => x.id === item.listing_id)?.title ||
                    item.listing_id}
                </p>
              </TableCell>
              <TableCell>{item.reason}</TableCell>
              <TableCell className="max-w-sm whitespace-normal">
                {item.description || "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={item.status} />
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-2">
                  {item.status === "pending" && (
                    <ActionButton
                      action={() => moderateReport(item.id, "under_review")}
                    >
                      Review
                    </ActionButton>
                  )}
                  <ActionButton
                    action={() => moderateReport(item.id, "resolved")}
                  >
                    Resolve
                  </ActionButton>
                  <ActionButton
                    action={() => moderateReport(item.id, "dismissed")}
                    variant="outline"
                  >
                    Dismiss
                  </ActionButton>
                  <ActionButton
                    action={() => moderateReport(item.id, "resolved", true)}
                    variant="destructive"
                    confirmation="Resolve this report and suspend the listing from public view?"
                  >
                    Suspend Listing
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
