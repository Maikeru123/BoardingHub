"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { ActionResult } from "@/types/domain"
export function useActionResult() {
  const router = useRouter()
  const [error, setError] = useState<string>()
  async function run(action: () => Promise<ActionResult>) {
    setError(undefined)
    try {
      const result = await action()
      if (result.error) {
        setError(result.error)
        toast.error(result.error)
        return false
      }
      if (result.success) toast.success(result.success)
      if (result.redirectTo) router.push(result.redirectTo)
      // Server Actions revalidate their affected paths and return the fresh UI.
      // Refreshing here starts another request and can race the navigation above.
      return true
    } catch {
      const message = "Something went wrong. Please refresh and try again."
      setError(message)
      toast.error(message)
      return false
    }
  }
  return { run, error }
}
