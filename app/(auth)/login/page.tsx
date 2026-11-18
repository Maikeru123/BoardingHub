import { LoginForm } from "@/components/auth/auth-form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { isSupabaseConfigured } from "@/lib/supabase/config"
export const metadata = { title: "Sign in" }
const notices: Record<string, string> = {
  "invalid-link":
    "This email link is invalid or has expired. Request a new password reset link, or try signing in.",
  "password-updated": "Password updated. Sign in with your new password.",
}
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>
}) {
  const { notice, next } = await searchParams
  return (
    <>
      <p className="mb-3 text-xs font-semibold tracking-[0.15em] text-primary uppercase">
        Welcome to BoardingHub
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Good to see you again.
      </h1>
      <p className="mt-3 mb-8 text-sm text-muted-foreground">
        Sign in to find your space or manage your properties.
      </p>
      {!isSupabaseConfigured() && (
        <Alert className="mb-5">
          <AlertDescription>
            Account services are being set up. Sign-in will be available once
            setup is complete.
          </AlertDescription>
        </Alert>
      )}
      {notice && notices[notice] && (
        <Alert className="mb-5">
          <AlertDescription>{notices[notice]}</AlertDescription>
        </Alert>
      )}
      <LoginForm next={next} />
    </>
  )
}
