import { signOut } from "@/actions/auth"
import { Brand } from "@/components/shared"
import { Button } from "@/components/ui/button"
export default async function UnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>
}) {
  const { reason } = await searchParams
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 px-6 text-center"
    >
      <Brand />
      <h1 className="mt-6 text-2xl font-semibold">
        {reason === "suspended"
          ? "Your account is suspended."
          : "Your account needs attention."}
      </h1>
      <p className="text-sm leading-6 text-muted-foreground">
        {reason === "suspended"
          ? "An administrator has suspended access to this account. Please contact your BoardingHub administrator for assistance."
          : "We could not load your profile. Please contact your BoardingHub administrator to check your account setup."}
      </p>
      <form action={signOut}>
        <Button type="submit">Sign out</Button>
      </form>
    </main>
  )
}
