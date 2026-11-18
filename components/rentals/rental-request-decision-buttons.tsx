"use client"

import { useState, useTransition } from "react"
import { decideRentalRequest } from "@/actions/rentals"
import { ActionButton } from "@/components/action-button"
import { useActionResult } from "@/hooks/use-action-result"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function RentalRequestDecisionButtons({
  requestId,
}: {
  requestId: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pending, startTransition] = useTransition()
  const { run } = useActionResult()
  const reject = () =>
    startTransition(async () => {
      if (await run(() => decideRentalRequest(requestId, "rejected", reason))) {
        setOpen(false)
        setReason("")
      }
    })

  return (
    <div className="flex gap-2">
      <ActionButton
        action={() => decideRentalRequest(requestId, "approved")}
        confirmation="Availability will be checked again. The tenant will then be asked to pay the initial rent."
      >
        Approve
      </ActionButton>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger render={<Button type="button" variant="outline" />}>
          Reject
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject rental request</AlertDialogTitle>
            <AlertDialogDescription>
              Tell the tenant why their request was not accepted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`rejection-reason-${requestId}`}>
              Rejection reason
            </Label>
            <Textarea
              id={`rejection-reason-${requestId}`}
              value={reason}
              maxLength={1000}
              placeholder="Example: The room is no longer available for your selected dates."
              onChange={(event) => setReason(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Required. This feedback will be shown to the tenant.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending || reason.trim().length < 5}
              onClick={reject}
            >
              {pending ? "Rejecting…" : "Reject request"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
