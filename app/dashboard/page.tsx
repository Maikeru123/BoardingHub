import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
export const dynamic = "force-dynamic"
export default async function DashboardRedirect() {
  const { profile } = await requireRole()
  redirect(`/${profile.role}`)
}
