import Link from "next/link"
import { Building2, ChevronRight, House, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { label } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 font-bold tracking-tight"
      aria-label="BoardingHub home"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white">
        <House className="size-5" strokeWidth={2.5} />
      </span>
      {!compact && (
        <span className="text-xl">
          Boarding<span className="text-primary">Hub</span>
        </span>
      )}
    </Link>
  )
}
export function LinkButton({
  href,
  children,
  variant = "default",
  className,
}: {
  href: string
  children: React.ReactNode
  variant?: "default" | "outline" | "ghost"
  className?: string
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant }), "h-10 gap-2 px-4", className)}
    >
      {children}
    </Link>
  )
}
export function DashboardHeader({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Building2,
}: {
  title: string
  description: string
  action?: React.ReactNode
  icon?: LucideIcon
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-16 text-center">
      <span className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/7 text-primary">
        <Icon className="size-6" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 mb-6 max-w-md text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action}
    </div>
  )
}
export function StatusBadge({ status }: { status: string }) {
  const green = [
    "active",
    "available",
    "published",
    "approved",
    "paid",
    "completed",
    "resolved",
  ].includes(status)
  const red = [
    "suspended",
    "rejected",
    "cancelled",
    "dismissed",
    "overdue",
    "payment_rejected",
  ].includes(status)
  const yellow = [
    "pending",
    "for_review",
    "maintenance",
    "for_correction",
    "complete_address",
    "add_room",
    "add_photos",
    "create_listing",
    "needs_verification",
    "awaiting_approval",
    "needs_correction",
    "reserved",
    "ending",
    "under_review",
    "pending_review",
    "due_soon",
    "due",
    "future_reserved",
    "waiting_for_payment",
    "payment_required",
  ].includes(status)
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1.5 rounded-md border-0 px-2 py-1 font-medium",
        green
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : red
            ? "bg-red-500/10 text-red-700 dark:text-red-400"
            : yellow
              ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
              : "bg-muted text-muted-foreground"
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status === "pending_review"
        ? "Pending Review"
        : status === "payment_rejected"
          ? "Payment Rejected"
          : status === "future_reserved"
            ? "Future Reservation"
            : status === "waiting_for_payment"
              ? "Waiting for Payment"
              : status === "payment_required"
                ? "Payment Required"
                : label(status)}
    </Badge>
  )
}
export function StatCard({
  title,
  value,
  icon: Icon,
  caption,
  href,
}: {
  title: string
  value: number | string
  icon: LucideIcon
  caption: string
  href?: string
}) {
  const content = (
    <Card className="h-full gap-0 rounded-xl p-5 shadow-none transition-colors hover:border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className="rounded-lg bg-primary/7 p-2.5 text-primary">
          <Icon className="size-5" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-muted-foreground">{caption}</p>
    </Card>
  )
  return href ? <Link href={href}>{content}</Link> : content
}
export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-4 border-b px-6 py-5">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </section>
  )
}
export function Pagination({
  page,
  total,
  pageSize,
  base,
}: {
  page: number
  total: number
  pageSize: number
  base: string
}) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  const separator = base.includes("?") ? "&" : "?"
  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-between text-sm"
    >
      <span className="text-muted-foreground">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <LinkButton
            variant="outline"
            href={`${base}${separator}page=${page - 1}`}
          >
            Previous
          </LinkButton>
        )}
        {page < pages && (
          <LinkButton
            variant="outline"
            href={`${base}${separator}page=${page + 1}`}
          >
            Next
            <ChevronRight className="size-4" />
          </LinkButton>
        )}
      </div>
    </nav>
  )
}
