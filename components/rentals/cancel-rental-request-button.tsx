"use client"

import { cancelRentalRequest } from "@/actions/rentals"
import { ActionButton } from "@/components/action-button"

export function CancelRentalRequestButton({
  requestId,
}: {
  requestId: string
}) {
  return (
    <ActionButton
      action={() => cancelRentalRequest(requestId)}
      variant="outline"
      confirmation="Cancel this pending request?"
    >
      Cancel
    </ActionButton>
  )
}
