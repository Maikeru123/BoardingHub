import { ResetPasswordForm } from "@/components/auth/auth-form"
import { requireRole } from "@/lib/auth"
export const metadata = { title: "Choose a new password" }
export const dynamic = "force-dynamic"
export default async function ResetPage() {
  await requireRole()
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        Choose a new password.
      </h1>
      <p className="mt-3 mb-8 text-sm text-muted-foreground">
        Use at least 8 characters to secure your account.
      </p>
      <ResetPasswordForm />
    </>
  )
}
