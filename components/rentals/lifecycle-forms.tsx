"use client"

import { useState } from "react"
import {
  reviewPayment,
  setRentalEnd,
  submitPropertyReview,
} from "@/actions/rentals"
import { useActionResult } from "@/hooks/use-action-result"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function PaymentReviewForm({ paymentId }: { paymentId: string }) {
  const [remarks, setRemarks] = useState("")
  const [pending, setPending] = useState(false)
  const { run } = useActionResult()
  const decide = async (decision: "paid" | "rejected") => {
    setPending(true)
    await run(() => reviewPayment(paymentId, decision, remarks))
    setPending(false)
  }
  return (
    <div className="min-w-64 space-y-2">
      <Input
        aria-label="Owner remarks"
        placeholder="Remarks (optional)"
        value={remarks}
        onChange={(event) => setRemarks(event.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => decide("paid")}>
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => decide("rejected")}
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

export function RentalEndForm({
  rentalId,
  ending,
}: {
  rentalId: string
  ending: boolean
}) {
  const [expected, setExpected] = useState("")
  const [actual, setActual] = useState("")
  const [pending, setPending] = useState(false)
  const { run } = useActionResult()
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor={`expected-${rentalId}`}>Expected Move-out Date</Label>
        <Input
          id={`expected-${rentalId}`}
          type="date"
          value={expected}
          onChange={(event) => setExpected(event.target.value)}
        />
        <Button
          variant="outline"
          disabled={pending || !expected}
          onClick={async () => {
            setPending(true)
            await run(() => setRentalEnd(rentalId, expected, null))
            setPending(false)
          }}
        >
          Record notice
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`actual-${rentalId}`}>Actual Move-out Date</Label>
        <Input
          id={`actual-${rentalId}`}
          type="date"
          value={actual}
          onChange={(event) => setActual(event.target.value)}
        />
        <Button
          disabled={pending || !actual}
          onClick={async () => {
            setPending(true)
            await run(() => setRentalEnd(rentalId, expected || null, actual))
            setPending(false)
          }}
        >
          Complete rental
        </Button>
      </div>
      {!ending && (
        <p className="text-xs text-muted-foreground sm:col-span-2">
          For open-ended rentals, record expected move-out first when notice is
          given.
        </p>
      )}
    </div>
  )
}

export function PropertyReviewForm({ rentalId }: { rentalId: string }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [pending, setPending] = useState(false)
  const { run } = useActionResult()
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        await run(() =>
          submitPropertyReview({
            rental_transaction_id: rentalId,
            rating,
            comment,
          })
        )
        setPending(false)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor={`rating-${rentalId}`}>Rating</Label>
        <select
          id={`rating-${rentalId}`}
          className="form-select"
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
        >
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>
              {value} star{value === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`comment-${rentalId}`}>Comment</Label>
        <Textarea
          id={`comment-${rentalId}`}
          maxLength={3000}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>
      <Button disabled={pending}>
        {pending ? "Submitting…" : "Submit Review"}
      </Button>
    </form>
  )
}
