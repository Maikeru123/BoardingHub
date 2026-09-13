"use client"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { saveHouse } from "@/actions/properties"
import { houseSchema, type HouseInput } from "@/lib/validation"
import { Form, FormField } from "@/components/ui/form"
import { FormSection, FormFooter } from "./editor"
import { useActionResult } from "@/hooks/use-action-result"
import type { Amenity, House } from "@/types/domain"
export function HouseForm({
  house,
  amenities,
  selected = [],
}: {
  house?: House
  amenities: Amenity[]
  selected?: string[]
}) {
  const form = useForm<HouseInput>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      name: house?.name || "",
      description: house?.description || "",
      street: house?.street || "",
      barangay: house?.barangay || "",
      city: house?.city || "",
      province: house?.province || "",
      latitude: house?.latitude?.toString() || "",
      longitude: house?.longitude?.toString() || "",
      contact_number: house?.contact_number || "",
      house_rules: house?.house_rules || "",
      status: house?.status === "inactive" ? "inactive" : "active",
      amenity_ids: selected,
    },
  })
  const { run, error } = useActionResult()
  return (
    <Form {...form}>
      <form
        className="max-w-4xl space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          await run(() => saveHouse(house?.id || null, values))
        })}
      >
        {house && (
          <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-400">
            Updating property details returns its published or submitted
            listings to draft for a new review.
          </p>
        )}
        <FormSection
          title="Property information"
          description="Help people get to know your boarding house."
        >
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="name"
              label="Boarding house name"
              placeholder="e.g. The Blue House"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="description"
              label="Description"
              type="textarea"
              placeholder="Tell tenants about your property and its surroundings…"
            />
          </div>
          <FormField
            control={form.control}
            name="contact_number"
            label="Contact number"
            type="tel"
            placeholder="+63 917 123 4567"
          />
          <FormField
            control={form.control}
            name="status"
            label="Property status"
            options={[
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
        </FormSection>
        <FormSection
          title="Location"
          description="Give tenants a clear picture of where your property is located."
        >
          <FormField
            control={form.control}
            name="street"
            label="Street / building"
          />
          <FormField control={form.control} name="barangay" label="Barangay" />
          <FormField
            control={form.control}
            name="city"
            label="City / municipality"
            required
          />
          <FormField
            control={form.control}
            name="province"
            label="Province"
            required
          />
          <FormField
            control={form.control}
            name="latitude"
            label="Latitude (optional)"
            placeholder="e.g. 10.3157"
          />
          <FormField
            control={form.control}
            name="longitude"
            label="Longitude (optional)"
            placeholder="e.g. 123.8854"
          />
        </FormSection>
        <FormSection
          title="Amenities & house rules"
          description="Select the amenities your property offers."
        >
          <Controller
            control={form.control}
            name="amenity_ids"
            render={({ field }) => (
              <fieldset className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:grid-cols-3">
                <legend className="sr-only">Property amenities</legend>
                {amenities.map((amenity) => (
                  <label
                    key={amenity.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm has-checked:border-primary/40 has-checked:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      value={amenity.id}
                      checked={field.value.includes(amenity.id)}
                      onChange={(event) =>
                        field.onChange(
                          event.target.checked
                            ? [...field.value, amenity.id]
                            : field.value.filter((id) => id !== amenity.id)
                        )
                      }
                      className="size-4 accent-primary"
                    />
                    {amenity.name}
                  </label>
                ))}
              </fieldset>
            )}
          />
          <div className="sm:col-span-2">
            <FormField
              control={form.control}
              name="house_rules"
              label="House rules"
              type="textarea"
              placeholder="Visiting hours, quiet hours, smoking policy, and other guidelines…"
            />
          </div>
        </FormSection>
        <FormFooter
          pending={form.formState.isSubmitting}
          error={error}
          cancel="/owner/boarding-houses"
          title={house ? "Save property" : "Add boarding house"}
        />
      </form>
    </Form>
  )
}
