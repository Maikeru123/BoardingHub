"use client"

import { cancelTenantRental } from "@/actions/rentals"
import { ActionButton } from "@/components/action-button"

export function CancelApprovedRentalButton({ rentalId }: { rentalId: string }) {
  return (
    <ActionButton
      action={() => cancelTenantRental(rentalId)}
      variant="outline"
      confirmation="Cancel this rental request? You can cancel while it is waiting for payment. Any payment awaiting review will also be cancelled."
    >
      Cancel request
    </ActionButton>
  )
}
