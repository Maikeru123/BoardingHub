"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Send } from "lucide-react"
import { markInquiryRead, sendInquiryMessage } from "@/actions/inquiries"
import { useActionResult } from "@/hooks/use-action-result"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function InquiryReadMarker({
  threadId,
  unread,
}: {
  threadId: string
  unread: number
}) {
  const router = useRouter()
  useEffect(() => {
    if (unread > 0)
      void markInquiryRead(threadId).then((result) => {
        if (!result.error) router.refresh()
      })
  }, [threadId, unread, router])
  return null
}

export function MessageComposer({
  threadId,
  disabled,
}: {
  threadId: string
  disabled?: boolean
}) {
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const { run, error } = useActionResult()
  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await run(() => sendInquiryMessage(threadId, message))
      if (result) setMessage("")
    })
  }
  if (disabled)
    return (
      <div className="border-t bg-muted/40 p-4 text-center text-sm text-muted-foreground">
        This inquiry is closed and read-only.
      </div>
    )
  return (
    <form onSubmit={submit} className="border-t bg-card p-4">
      <label htmlFor="message" className="sr-only">
        Reply to inquiry
      </label>
      <div className="flex items-end gap-3">
        <Textarea
          id="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          maxLength={4000}
          rows={2}
          placeholder="Write a message…"
          aria-invalid={Boolean(error)}
          required
        />
        <Button
          type="submit"
          size="icon-lg"
          aria-label="Send message"
          disabled={pending || !message.trim()}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Send />}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
