"use client"
import { LoaderCircle, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { LinkButton } from "@/components/shared"
export function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border bg-card p-5 sm:p-7">
      <h2 className="mb-1 font-semibold">{title}</h2>
      {description && (
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      )}
      <div className="mt-6 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  )
}
export function FormFooter({
  pending,
  error,
  cancel,
  title = "Save changes",
  pendingTitle = "Saving…",
}: {
  pending: boolean
  error?: string
  cancel: string
  title?: string
  pendingTitle?: string
}) {
  return (
    <>
      <div aria-live="polite">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <LinkButton variant="outline" href={cancel}>
          Cancel
        </LinkButton>
        <Button type="submit" disabled={pending} className="h-10 gap-2 px-5">
          {pending ? <LoaderCircle className="animate-spin" /> : <Save />}
          {pending ? pendingTitle : title}
        </Button>
      </div>
    </>
  )
}
