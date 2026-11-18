"use client"

import { useMemo } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { CalendarDays, ReceiptText } from "lucide-react"
import { requestRental } from "@/actions/rentals"
import { rentalRequestSchema } from "@/lib/validation"
import { currency } from "@/lib/format"
import { calculateInitialPayment } from "@/lib/rental-payment"
import { useActionResult } from "@/hooks/use-action-result"
import { Form, FormField } from "@/components/ui/form"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { House, Room } from "@/types/domain"

type Values = {
  room_id: string
  rental_type: "fixed_term" | "open_ended"
  move_in_date: string
  expected_move_out_date: string
}

export function RentalRequestForm({
  room,
  house,
}: {
  room: Room
  house: House
}) {
  const form = useForm<Values>({
    resolver: zodResolver(rentalRequestSchema),
    defaultValues: {
      room_id: room.id,
      rental_type: "open_ended",
      move_in_date: "",
      expected_move_out_date: "",
    },
  })
  const [rentalType, moveIn, moveOut] = useWatch({
    control: form.control,
    name: ["rental_type", "move_in_date", "expected_move_out_date"],
  })
  const { run, error } = useActionResult()
  const initialPayment = calculateInitialPayment(
    Number(room.monthly_rent),
    house.current_month_required,
    house.advance_months_required
  )
  const duration = useMemo(() => {
    if (!moveIn || !moveOut || moveOut <= moveIn) return null
    const days = Math.ceil(
      (new Date(`${moveOut}T00:00:00Z`).getTime() -
        new Date(`${moveIn}T00:00:00Z`).getTime()) /
        86400000
    )
    return `${days} day${days === 1 ? "" : "s"} (about ${Math.max(1, Math.round(days / 30.44))} month${days < 46 ? "" : "s"})`
  }, [moveIn, moveOut])
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) =>
          run(() => requestRental(values))
        )}
      >
        <input type="hidden" {...form.register("room_id")} />
        <FormField
          control={form.control}
          name="rental_type"
          label="Rental Type"
          options={[
            { value: "open_ended", label: "Open-ended / Long-term" },
            { value: "fixed_term", label: "Fixed-term" },
          ]}
        />
        <FormField
          control={form.control}
          name="move_in_date"
          label="Move-in Date"
          type="date"
          required
        />
        {rentalType === "fixed_term" && (
          <FormField
            control={form.control}
            name="expected_move_out_date"
            label="Expected Move-out Date"
            type="date"
            required
          />
        )}
        {duration && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarDays className="size-4" /> Rental duration: {duration}
          </p>
        )}
        <div className="rounded-lg bg-muted/60 p-4 text-sm">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            <ReceiptText className="size-4 text-primary" /> Payment terms
          </p>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt>Monthly Rent</dt>
              <dd>{currency(Number(room.monthly_rent))}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Current Month Payment</dt>
              <dd>
                {house.current_month_required ? "Required" : "Not Required"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>Advance Payment</dt>
              <dd>
                {house.advance_months_required === 0
                  ? "No Advance"
                  : `${house.advance_months_required} Month${house.advance_months_required === 1 ? "" : "s"}`}
              </dd>
            </div>
            <div className="mt-3 flex justify-between border-t pt-3 font-semibold">
              <dt>Estimated Initial Payment</dt>
              <dd className="text-primary">{currency(initialPayment)}</dd>
            </div>
          </dl>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? "Checking availability…"
            : "Submit Rental Request"}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          Availability is checked again when the owner approves your request.
        </p>
      </form>
    </Form>
  )
}
