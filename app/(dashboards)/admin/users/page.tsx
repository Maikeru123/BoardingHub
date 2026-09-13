import { requireRole } from "@/lib/auth"
import { getAccounts } from "@/lib/data"
import { setAccountStatus } from "@/actions/listings"
import { DashboardHeader, Pagination, StatusBadge } from "@/components/shared"
import { ActionButton } from "@/components/action-button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { label, date } from "@/lib/format"
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: value } = await searchParams
  const page = Math.max(1, Number(value) || 1)
  const { user } = await requireRole("admin")
  const { accounts, total } = await getAccounts(page)
  return (
    <>
      <DashboardHeader
        title="User accounts"
        description="Manage community account access. Account roles are assigned through controlled setup."
      />
      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Account access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.first_name} {p.last_name}
                </TableCell>
                <TableCell>{label(p.role)}</TableCell>
                <TableCell>{p.contact_number || "—"}</TableCell>
                <TableCell>
                  <StatusBadge status={p.status} />
                </TableCell>
                <TableCell>{date(p.created_at)}</TableCell>
                <TableCell>
                  {p.id === user.id ? (
                    <span className="text-xs text-muted-foreground">
                      Your account
                    </span>
                  ) : (
                    <ActionButton
                      action={setAccountStatus.bind(
                        null,
                        p.id,
                        p.status === "active" ? "suspended" : "active"
                      )}
                      variant={
                        p.status === "active" ? "destructive" : "outline"
                      }
                      confirmation={
                        p.status === "active"
                          ? "Suspend this account? The user will lose workspace access and any properties they own will be hidden from public browsing."
                          : "Restore access to this account? Previously published properties may become visible again."
                      }
                    >
                      {p.status === "active" ? "Suspend" : "Reactivate"}
                    </ActionButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} total={total} pageSize={25} base="/admin/users" />
    </>
  )
}
