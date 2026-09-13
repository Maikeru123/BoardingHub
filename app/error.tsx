"use client"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-8 text-center"
    >
      <AlertTriangle className="size-10 text-amber-500" />
      <h1 className="text-2xl font-semibold">We couldn’t load this page.</h1>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        Please try again. If the issue continues, contact your BoardingHub
        administrator.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
