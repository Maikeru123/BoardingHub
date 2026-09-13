import { requireRole } from "@/lib/auth"
import { DashboardShell } from "@/components/dashboard/shell"
export const dynamic = "force-dynamic"
export default async function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireRole("tenant")
  return <DashboardShell profile={profile}>{children}</DashboardShell>
}
