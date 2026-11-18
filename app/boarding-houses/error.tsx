"use client"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
export default function ErrorPage({
  reset,
}: {
  error: Error
  reset: () => void
}) {
  return (
    <main className="page-container py-16">
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>Boarding houses could not be loaded</AlertTitle>
        <AlertDescription>
          Please check your connection and try again.{" "}
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={reset}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  )
}
