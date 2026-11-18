"use client"

import { useState, useTransition } from "react"
import { LoaderCircle, MessageSquare } from "lucide-react"
import { startInquiry } from "@/actions/inquiries"
import { useActionResult } from "@/hooks/use-action-result"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

export function ContactOwner({
  listingId,
  houseName,
}: {
  listingId: string
  houseName: string
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const { run, error } = useActionResult()
  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await run(() => startInquiry(listingId, message))
      if (result) setOpen(false)
    })
  }
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button className="h-11 w-full" />}>
        <MessageSquare /> Contact property owner
      </SheetTrigger>
      <SheetContent className="w-full! sm:max-w-md!">
        <SheetHeader>
          <SheetTitle>Ask about {houseName}</SheetTitle>
          <SheetDescription>
            Your message starts a private conversation with the property owner.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="space-y-4 px-4">
          <div className="space-y-2">
            <Label htmlFor="inquiry-message">Message</Label>
            <Textarea
              id="inquiry-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={4000}
              rows={6}
              placeholder="Hello, I would like to ask if a room is available next month."
              aria-invalid={Boolean(error)}
              required
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full"
            disabled={pending || !message.trim()}
          >
            {pending ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <MessageSquare />
            )}{" "}
            Send inquiry
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            If you already have an open inquiry for this listing, your message
            will continue that conversation.
          </p>
        </form>
      </SheetContent>
    </Sheet>
  )
}
