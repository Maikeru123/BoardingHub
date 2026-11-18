"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { saveListing } from "@/actions/listings"
import { listingSchema, type ListingInput } from "@/lib/validation"
import { Form, FormField } from "@/components/ui/form"
import { FormSection, FormFooter } from "./editor"
import { useActionResult } from "@/hooks/use-action-result"
import type { House, Listing } from "@/types/domain"
export function ListingForm({
  listing,
  houses,
}: {
  listing?: Listing
  houses: House[]
}) {
  const form = useForm<ListingInput>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      boarding_house_id: listing?.boarding_house_id || houses[0]?.id || "",
      title: listing?.title || "",
      description: listing?.description || "",
    },
  })
  const { run, error } = useActionResult()
  return (
    <Form {...form}>
      <form
        className="max-w-4xl space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          await run(() => saveListing(listing?.id || null, values))
        })}
      >
        <FormSection
          title="Listing information"
          description="Create the advertisement for a boarding house. Property photos are managed on the boarding house itself."
        >
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="boarding_house_id"
              label="Boarding house"
              options={houses.map((h) => ({ value: h.id, label: h.name }))}
              disabled={Boolean(listing)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="title"
              label="Listing title"
              placeholder="e.g. Comfortable rooms near the university"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="description"
              label="Listing description"
              type="textarea"
              placeholder="What makes this place a great choice for tenants?"
            />
          </div>
        </FormSection>
        <FormFooter
          pending={form.formState.isSubmitting}
          error={error}
          cancel="/owner/listings"
          title={listing ? "Save draft" : "Save listing draft"}
        />
      </form>
    </Form>
  )
}
