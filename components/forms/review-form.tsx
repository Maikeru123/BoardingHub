"use client"
import { useState } from "react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { reviewListing } from "@/actions/listings"
import { reviewSchema } from "@/lib/validation"
import { Form, FormField } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { useActionResult } from "@/hooks/use-action-result"
export function ReviewForm({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false)
  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { decision: "approved", remarks: "" },
  })
  const { run, error } = useActionResult()
  const save = form.handleSubmit(async (values) => {
    if (await run(() => reviewListing(listingId, values))) setOpen(false)
  })
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(() => setOpen(true))}
      >
        <FormField
          control={form.control}
          name="decision"
          label="Review decision"
          options={[
            { value: "approved", label: "Approve & publish" },
            { value: "for_correction", label: "Request correction" },
            { value: "rejected", label: "Reject listing" },
          ]}
        />
        <FormField
          control={form.control}
          name="remarks"
          label="Remarks"
          type="textarea"
          description="Required when rejecting a listing or requesting correction."
        />
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" className="h-10 w-full">
          Save review
        </Button>
      </form>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm review decision</AlertDialogTitle>
            <AlertDialogDescription>
              Approval publishes this listing immediately. A rejection or
              correction returns your remarks to the owner.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={form.formState.isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={form.formState.isSubmitting}
              onClick={() => save()}
            >
              {form.formState.isSubmitting ? "Saving…" : "Confirm decision"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  )
}
