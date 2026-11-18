"use client"

import { useId, useState } from "react"
import { CalendarDays } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function DateRangeSelector() {
  const id = useId()
  const [moveIn, setMoveIn] = useState("")
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarDays className="size-4 text-primary" /> Plan your stay
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div className="space-y-2">
          <Label htmlFor={`${id}-in`}>Move-in date</Label>
          <Input
            id={`${id}-in`}
            type="date"
            min={today}
            value={moveIn}
            onChange={(event) => setMoveIn(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${id}-out`}>Move-out date</Label>
          <Input id={`${id}-out`} type="date" min={moveIn || today} />
        </div>
      </div>
      <p className="text-xs leading-5 text-muted-foreground">
        Dates help frame your inquiry. Availability is based on the room’s
        general status and is not a reservation.
      </p>
    </div>
  )
}
