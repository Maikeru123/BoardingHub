"use client"

import { useId } from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"

export type ComboboxOption = { code: string; name: string }

export function SearchableCombobox({
  label,
  placeholder,
  searchPlaceholder,
  value,
  options,
  onValueChange,
  disabled = false,
  loading = false,
  error,
  description,
  required = false,
}: {
  label: string
  placeholder: string
  searchPlaceholder: string
  value: string
  options: ComboboxOption[]
  onValueChange: (option: ComboboxOption | null) => void
  disabled?: boolean
  loading?: boolean
  error?: string
  description?: string
  required?: boolean
}) {
  const id = useId()
  const selected = options.find((option) => option.code === value) || null
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-primary">
            *
          </span>
        )}
      </FieldLabel>
      <ComboboxPrimitive.Root
        items={options}
        value={selected}
        onValueChange={onValueChange}
        itemToStringLabel={(option: ComboboxOption) => option.name}
        itemToStringValue={(option: ComboboxOption) => option.code}
        isItemEqualToValue={(option, current) => option.code === current.code}
        openOnInputClick
        autoHighlight
        disabled={disabled}
      >
        <div className="relative">
          <ComboboxPrimitive.Input
            id={id}
            placeholder={selected ? selected.name : placeholder}
            aria-invalid={Boolean(error)}
            aria-describedby={
              [description && `${id}-description`, error && `${id}-error`]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className="form-input h-11 pr-10"
          />
          <ComboboxPrimitive.Trigger
            aria-label={`Open ${label.toLowerCase()} options`}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ChevronsUpDown className="size-4" />
            )}
          </ComboboxPrimitive.Trigger>
        </div>
        <ComboboxPrimitive.Portal>
          <ComboboxPrimitive.Positioner
            sideOffset={4}
            align="start"
            className="z-50 outline-none"
          >
            <ComboboxPrimitive.Popup className="max-h-72 w-(--anchor-width) min-w-60 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
              <div className="border-b px-3 py-2 text-xs text-muted-foreground">
                {searchPlaceholder}
              </div>
              <ComboboxPrimitive.List className="max-h-60 overflow-y-auto p-1">
                {(option: ComboboxOption) => (
                  <ComboboxPrimitive.Item
                    key={option.code}
                    value={option}
                    className="flex cursor-default items-center gap-2 rounded-md px-2 py-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    <ComboboxPrimitive.ItemIndicator className="flex size-4 items-center justify-center">
                      <Check className="size-4" />
                    </ComboboxPrimitive.ItemIndicator>
                    <span className="truncate">{option.name}</span>
                  </ComboboxPrimitive.Item>
                )}
              </ComboboxPrimitive.List>
              <ComboboxPrimitive.Empty
                className={cn(
                  "px-4 py-6 text-center text-sm text-muted-foreground",
                  loading && "animate-pulse"
                )}
              >
                {loading ? "Loading locations…" : "No matching location found."}
              </ComboboxPrimitive.Empty>
            </ComboboxPrimitive.Popup>
          </ComboboxPrimitive.Positioner>
        </ComboboxPrimitive.Portal>
      </ComboboxPrimitive.Root>
      {description && (
        <FieldDescription id={`${id}-description`}>
          {description}
        </FieldDescription>
      )}
      {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
    </Field>
  )
}
