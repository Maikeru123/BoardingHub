"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { saveHouse } from "@/actions/properties"
import { uploadHousePhoto } from "@/actions/photos"
import { houseSchema, type HouseInput } from "@/lib/validation"
import { Form, FormField } from "@/components/ui/form"
import { FormSection, FormFooter } from "./editor"
import { useActionResult } from "@/hooks/use-action-result"
import { PhilippineAddressSelector } from "@/components/boarding-house/philippine-address-selector"
import { NewBoardingHousePhotoPicker } from "@/components/boarding-house/new-photo-picker"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
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
  const router = useRouter()
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [photoError, setPhotoError] = useState<string>()
  const form = useForm<HouseInput>({
    resolver: zodResolver(houseSchema),
    defaultValues: {
      name: house?.name || "",
      description: house?.description || "",
      street: house?.street || "",
      barangay: house?.barangay || "",
      city_municipality: house?.city_municipality || "",
      province: house?.province || "",
      barangay_code: house?.barangay_code || "",
      city_municipality_code: house?.city_municipality_code || "",
      province_code: house?.province_code || "",
      postal_code: house?.postal_code || "",
      contact_number: house?.contact_number || "",
      house_rules: house?.house_rules || "",
      status: house?.status === "archived" ? "archived" : "active",
      current_month_required: house?.current_month_required ?? true,
      advance_months_required: house?.advance_months_required ?? 0,
      amenity_ids: selected,
    },
  })
  const [currentMonthRequired, advanceMonthsRequired] = useWatch({
    control: form.control,
    name: ["current_month_required", "advance_months_required"],
  })
  const { run, error } = useActionResult()
  return (
    <Form {...form}>
      <form
        className="max-w-4xl space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          setPhotoError(undefined)
          setUploadProgress(0)
          const result = await run(() => saveHouse(house?.id || null, values))
          if (!result || house) return

          const houseId = result.entityId
          if (!houseId) {
            setPhotoError(
              "The property was saved, but its identifier was not returned. Open it from your properties page to add photos."
            )
            router.push("/owner/boarding-houses")
            return
          }

          for (let index = 0; index < photoFiles.length; index += 1) {
            const data = new FormData()
            data.set("photo", photoFiles[index])
            try {
              const upload = await uploadHousePhoto(houseId, data)
              if (upload.error) {
                toast.error(upload.error)
                router.push(
                  `/owner/boarding-houses/${houseId}/edit?photo-upload=retry`
                )
                return
              }
              setUploadProgress(index + 1)
            } catch {
              toast.error(
                "The property was saved, but a photo could not be uploaded. Add the remaining photos from the property editor."
              )
              router.push(
                `/owner/boarding-houses/${houseId}/edit?photo-upload=retry`
              )
              return
            }
          }

          if (photoFiles.length)
            toast.success(
              `${photoFiles.length} property photo${photoFiles.length === 1 ? "" : "s"} uploaded.`
            )
          router.push(`/owner/boarding-houses/${houseId}/edit?created=1`)
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
              { value: "archived", label: "Archived" },
            ]}
          />
        </FormSection>
        <FormSection
          title="Rental payment terms"
          description="These terms are shown to tenants and snapshotted when a rental is approved."
        >
          <Controller
            control={form.control}
            name="current_month_required"
            render={({ field, fieldState }) => (
              <Field
                orientation="horizontal"
                data-invalid={fieldState.invalid}
                className="rounded-lg border p-4"
              >
                <Checkbox
                  id="current-month-required"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
                <div className="space-y-1">
                  <FieldLabel htmlFor="current-month-required">
                    Require Current Month Payment
                  </FieldLabel>
                  <FieldDescription>
                    Include one month of rent in the initial payment.
                  </FieldDescription>
                  {fieldState.error && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </div>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="advance_months_required"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="advance-months-required">
                  Advance Payment
                </FieldLabel>
                <Select
                  value={String(field.value)}
                  onValueChange={(value) => field.onChange(Number(value))}
                >
                  <SelectTrigger
                    id="advance-months-required"
                    className="h-11 w-full"
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }, (_, months) => (
                      <SelectItem key={months} value={String(months)}>
                        {months === 0
                          ? "No Advance"
                          : `${months} Month${months === 1 ? "" : "s"} Advance`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <div className="rounded-lg bg-muted/60 p-4 text-sm sm:col-span-2">
            <p className="font-semibold">Payment Terms Preview</p>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-4">
                <dt>Current Month:</dt>
                <dd>{currentMonthRequired ? "Required" : "Not Required"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Advance:</dt>
                <dd>
                  {advanceMonthsRequired === 0
                    ? "No Advance"
                    : `${advanceMonthsRequired} Month${advanceMonthsRequired === 1 ? "" : "s"}`}
                </dd>
              </div>
            </dl>
            <p className="mt-3 border-t pt-3 text-xs leading-5 text-muted-foreground">
              Estimated initial payment will be calculated later using the
              selected room&apos;s monthly rent.
            </p>
          </div>
        </FormSection>
        <FormSection
          title="Location"
          description="Choose a matching PSGC province, city or municipality, and barangay."
        >
          <PhilippineAddressSelector form={form} />
          <input type="hidden" {...form.register("province")} />
          <input type="hidden" {...form.register("city_municipality")} />
          <input type="hidden" {...form.register("barangay")} />
          <FormField
            control={form.control}
            name="street"
            label="Street / building"
            placeholder="House number, building, and street"
          />
          <FormField
            control={form.control}
            name="postal_code"
            label="Postal code (optional)"
            inputMode="numeric"
            placeholder="e.g. 8000"
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
        {!house && (
          <FormSection
            title="Property photos"
            description="Choose up to 12 photos now. They will upload automatically when you save the property."
          >
            <NewBoardingHousePhotoPicker
              disabled={form.formState.isSubmitting}
              progress={uploadProgress}
              onFilesChange={setPhotoFiles}
            />
          </FormSection>
        )}
        <FormFooter
          pending={form.formState.isSubmitting}
          error={photoError || error}
          cancel="/owner/boarding-houses"
          title={house ? "Save property" : "Create Boarding House"}
          pendingTitle={
            house
              ? "Saving property…"
              : photoFiles.length
                ? `Creating and uploading ${photoFiles.length} photo${photoFiles.length === 1 ? "" : "s"}…`
                : "Creating boarding house…"
          }
        />
      </form>
    </Form>
  )
}
