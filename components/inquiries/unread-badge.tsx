export function UnreadInquiryBadge({ count }: { count: number }) {
  if (count <= 0) return null
  const display = count > 99 ? "99+" : String(count)
  return (
    <span
      aria-label={`${count} unread inquiry ${count === 1 ? "message" : "messages"}`}
      title={`${count} unread inquiry ${count === 1 ? "message" : "messages"}`}
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none font-semibold text-primary-foreground"
    >
      {display}
    </span>
  )
}
