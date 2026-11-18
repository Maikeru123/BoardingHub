"use client"

import { useState } from "react"
import { reportListing, sendFeedback } from "@/actions/rentals"
import { useActionResult } from "@/hooks/use-action-result"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ReportListingForm({ listingId }: { listingId: string }) {
  const [reason, setReason] = useState("")
  const [description, setDescription] = useState("")
  const [pending, setPending] = useState(false)
  const { run } = useActionResult()
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await run(() =>
          reportListing(listingId, { reason, description })
        )
        if (result) {
          setReason("")
          setDescription("")
        }
        setPending(false)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="report-reason">Reason</Label>
        <Input
          id="report-reason"
          maxLength={160}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="report-description">Description</Label>
        <Textarea
          id="report-description"
          maxLength={3000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Submitting…" : "Report listing"}
      </Button>
    </form>
  )
}

export function FeedbackForm() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  const { run } = useActionResult()
  return (
    <form
      className="max-w-2xl space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        const result = await run(() => sendFeedback({ subject, message }))
        if (result) {
          setSubject("")
          setMessage("")
        }
        setPending(false)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="feedback-subject">Subject</Label>
        <Input
          id="feedback-subject"
          maxLength={160}
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="feedback-message">Message</Label>
        <Textarea
          id="feedback-message"
          rows={7}
          maxLength={4000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
      </div>
      <Button disabled={pending}>
        {pending ? "Sending…" : "Send Feedback"}
      </Button>
    </form>
  )
}
