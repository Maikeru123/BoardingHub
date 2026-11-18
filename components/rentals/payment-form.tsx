"use client"

import { useState } from "react"
import { submitPayment } from "@/actions/rentals"
import { currency, date } from "@/lib/format"
import { useActionResult } from "@/hooks/use-action-result"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { BillingSummary } from "@/lib/rental-payment"
import type { RentalTransaction } from "@/types/domain"

export function PaymentForm({
  rental,
  summary,
}: {
  rental: RentalTransaction
  summary: BillingSummary
}) {
  const [method, setMethod] = useState<"cash" | "gcash">("cash")
  const [pending, setPending] = useState(false)
  const { run, error } = useActionResult()
  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault()
        setPending(true)
        await run(() => submitPayment(new FormData(event.currentTarget)))
        setPending(false)
      }}
    >
      <input type="hidden" name="rental_transaction_id" value={rental.id} />
      <input type="hidden" name="payment_type" value={summary.paymentType} />
      <input type="hidden" name="amount" value={summary.amountDue} />
      <input
        type="hidden"
        name="billing_period_start"
        value={summary.billingPeriodStart || ""}
      />
      <input
        type="hidden"
        name="billing_period_end"
        value={summary.billingPeriodEnd || ""}
      />

      <div className="rounded-lg bg-muted/60 p-4 text-sm">
        <p className="font-semibold">
          {summary.paymentType === "initial"
            ? "Initial payment"
            : "Monthly payment"}
        </p>
        {summary.billingPeriodStart && (
          <p className="mt-1 text-xs text-muted-foreground">
            Billing period: {date(summary.billingPeriodStart)} –{" "}
            {date(summary.billingPeriodEnd)}
          </p>
        )}
        <p className="mt-3 text-2xl font-semibold text-primary">
          {currency(summary.amountDue)}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Payment Method</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["cash", "gcash"] as const).map((value) => (
            <Label
              key={value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 has-checked:border-primary/50 has-checked:bg-primary/5"
            >
              <input
                type="radio"
                name="payment_method"
                value={value}
                checked={method === value}
                onChange={() => setMethod(value)}
                className="size-4 accent-primary"
              />
              {value === "cash" ? "Cash" : "GCash"}
            </Label>
          ))}
        </div>
      </fieldset>

      {method === "gcash" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="reference_number">GCash Reference Number</Label>
            <Input
              id="reference_number"
              name="reference_number"
              maxLength={160}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proof">Proof of Payment Image</Label>
            <Input
              id="proof"
              name="proof"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
            />
            <p className="text-xs text-muted-foreground">
              Valid JPG, PNG, or WebP screenshot up to 5 MB.
            </p>
          </div>
        </>
      ) : (
        <input type="hidden" name="reference_number" value="" />
      )}

      {summary.state === "payment_rejected" && (
        <Alert variant="destructive">
          <AlertDescription>
            The previous submission was rejected. Review the owner&apos;s
            remarks and submit a corrected payment.
          </AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending
          ? "Submitting…"
          : method === "cash"
            ? "Submit Cash Payment"
            : "Submit GCash Payment"}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        The property owner must confirm the payment before it is marked paid.
      </p>
    </form>
  )
}
