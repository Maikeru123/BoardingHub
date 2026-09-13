import { ForgotPasswordForm } from "@/components/auth/auth-form"
export const metadata = { title: "Reset your password" }
export default function ForgotPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">
        Forgot your password?
      </h1>
      <p className="mt-3 mb-8 text-sm leading-6 text-muted-foreground">
        Enter your account email and we’ll send you a link to choose a new
        password.
      </p>
      <ForgotPasswordForm />
    </>
  )
}
