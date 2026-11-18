import type { Payment, RentalTransaction } from "@/types/domain"

export function calculateInitialPayment(
  monthlyRent: number,
  currentMonthRequired: boolean,
  advanceMonthsRequired: number
) {
  return (
    monthlyRent * (currentMonthRequired ? 1 : 0) +
    monthlyRent * advanceMonthsRequired
  )
}

export type BillingState =
  | "paid"
  | "pending_review"
  | "payment_rejected"
  | "due_soon"
  | "due"
  | "overdue"
  | "upcoming"

export type BillingSummary = {
  paymentType: "initial" | "monthly"
  nextPaymentDue: string
  billingPeriodStart: string | null
  billingPeriodEnd: string | null
  amountDue: number
  state: BillingState
  currentPayment: Payment | null
  lastPaidPayment: Payment | null
}

export function displayPaymentStatus(status: string) {
  if (status === "pending") return "pending_review"
  if (status === "rejected") return "payment_rejected"
  return status
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10)
}

export function addCalendarMonths(value: string, months: number) {
  const source = parseDateOnly(value)
  const year = source.getUTCFullYear()
  const month = source.getUTCMonth() + months
  const day = source.getUTCDate()
  const targetMonth = new Date(Date.UTC(year, month, 1))
  const lastDay = new Date(
    Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)
  ).getUTCDate()
  return dateOnly(
    new Date(
      Date.UTC(
        targetMonth.getUTCFullYear(),
        targetMonth.getUTCMonth(),
        Math.min(day, lastDay)
      )
    )
  )
}

function previousDay(value: string) {
  const date = parseDateOnly(value)
  date.setUTCDate(date.getUTCDate() - 1)
  return dateOnly(date)
}

function dayDifference(from: string, to: string) {
  return Math.round(
    (parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000
  )
}

export function getBillingSummary(
  rental: RentalTransaction,
  payments: Payment[],
  today = new Date().toISOString().slice(0, 10)
): BillingSummary {
  const rentalPayments = payments
    .filter((payment) => payment.rental_transaction_id === rental.id)
    .toSorted((a, b) => b.payment_date.localeCompare(a.payment_date))
  const lastPaidPayment =
    rentalPayments.find((payment) => payment.payment_status === "paid") || null
  const initialPayments = rentalPayments.filter(
    (payment) => payment.payment_type === "initial"
  )
  const initialPaid = initialPayments.some(
    (payment) => payment.payment_status === "paid"
  )
  const initialAmount = Number(rental.initial_payment_amount)

  if (initialAmount > 0 && !initialPaid) {
    const currentPayment = initialPayments[0] || null
    return {
      paymentType: "initial",
      nextPaymentDue: rental.start_date,
      billingPeriodStart: null,
      billingPeriodEnd: null,
      amountDue: initialAmount,
      state:
        currentPayment?.payment_status === "pending"
          ? "pending_review"
          : currentPayment?.payment_status === "rejected"
            ? "payment_rejected"
            : dayDifference(today, rental.start_date) < 0
              ? "overdue"
              : dayDifference(today, rental.start_date) === 0
                ? "due"
                : dayDifference(today, rental.start_date) <= 7
                  ? "due_soon"
                  : "upcoming",
      currentPayment,
      lastPaidPayment,
    }
  }

  let cycle =
    (rental.current_month_required ? 1 : 0) + rental.advance_months_required
  let billingPeriodStart = addCalendarMonths(rental.start_date, cycle)
  while (
    rentalPayments.some(
      (payment) =>
        payment.payment_type === "monthly" &&
        payment.payment_status === "paid" &&
        payment.billing_period_start === billingPeriodStart
    )
  ) {
    cycle += 1
    billingPeriodStart = addCalendarMonths(rental.start_date, cycle)
  }
  const billingPeriodEnd = previousDay(
    addCalendarMonths(rental.start_date, cycle + 1)
  )
  const currentPayment =
    rentalPayments.find(
      (payment) =>
        payment.payment_type === "monthly" &&
        payment.billing_period_start === billingPeriodStart &&
        payment.payment_status !== "cancelled"
    ) || null
  const daysUntilDue = dayDifference(today, billingPeriodStart)
  const state: BillingState =
    currentPayment?.payment_status === "pending"
      ? "pending_review"
      : currentPayment?.payment_status === "rejected"
        ? "payment_rejected"
        : daysUntilDue < 0
          ? "overdue"
          : daysUntilDue === 0
            ? "due"
            : daysUntilDue <= 7
              ? "due_soon"
              : today >= rental.start_date &&
                  (initialPaid || cycle > 0 || Boolean(lastPaidPayment))
                ? "paid"
                : "upcoming"

  return {
    paymentType: "monthly",
    nextPaymentDue: billingPeriodStart,
    billingPeriodStart,
    billingPeriodEnd,
    amountDue: Number(rental.monthly_rent),
    state,
    currentPayment,
    lastPaidPayment,
  }
}
