import { RegisterForm } from "@/components/auth/auth-form"
export const metadata = { title: "Create an account" }
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>
}) {
  const { role } = await searchParams
  return (
    <>
      <p className="mb-3 text-xs font-semibold tracking-[0.15em] text-primary uppercase">
        Make yourself at home
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Your next chapter starts here.
      </h1>
      <p className="mt-3 mb-7 text-sm text-muted-foreground">
        Create an account to get started with BoardingHub.
      </p>
      <RegisterForm role={role === "owner" ? "owner" : "tenant"} />
    </>
  )
}
