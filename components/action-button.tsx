"use client"
import { useState, useTransition } from "react"
import { LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useActionResult } from "@/hooks/use-action-result"
import type { ActionResult } from "@/types/domain"
export function ActionButton({
  action,
  children,
  confirmation,
  variant = "outline",
  disabled = false,
}: {
  action: () => Promise<ActionResult>
  children: React.ReactNode
  confirmation?: string
  variant?: "default" | "outline" | "destructive" | "ghost"
  disabled?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const { run } = useActionResult()
  const execute = () =>
    startTransition(async () => {
      if (await run(action)) setOpen(false)
    })
  if (!confirmation)
    return (
      <Button
        type="button"
        variant={variant}
        disabled={pending || disabled}
        onClick={execute}
      >
        {pending && <LoaderCircle className="animate-spin" />}
        {children}
      </Button>
    )
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant={variant}
            disabled={pending || disabled}
          />
        }
      >
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{children}</AlertDialogTitle>
          <AlertDialogDescription>{confirmation}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={pending || disabled} onClick={execute}>
            {pending ? "Saving…" : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
