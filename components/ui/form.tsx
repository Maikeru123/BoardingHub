"use client"
// React Hook Form adapter for shadcn's current Field-based form components.
import { useId } from "react"
import {
  FormProvider,
  Controller,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export const Form = FormProvider
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  type = "text",
  placeholder,
  description,
  options,
  disabled,
  autoComplete,
  required,
  step,
  inputMode,
}: {
  control: Control<T>
  name: Path<T>
  label: string
  type?: string
  placeholder?: string
  description?: string
  options?: { value: string; label: string }[]
  disabled?: boolean
  autoComplete?: string
  required?: boolean
  step?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
}) {
  const id = useId()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const shared = {
          id,
          "aria-invalid": fieldState.invalid,
          "aria-describedby":
            [
              description && `${id}-description`,
              fieldState.error && `${id}-error`,
            ]
              .filter(Boolean)
              .join(" ") || undefined,
          disabled,
          required,
        }
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>
              {label}
              {required && (
                <span aria-hidden="true" className="text-primary">
                  *
                </span>
              )}
            </FieldLabel>
            {options ? (
              <select {...field} {...shared} className="form-select">
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : type === "textarea" ? (
              <Textarea
                {...field}
                {...shared}
                placeholder={placeholder}
                rows={4}
              />
            ) : (
              <Input
                {...field}
                {...shared}
                type={type}
                step={step}
                inputMode={inputMode}
                autoComplete={autoComplete}
                placeholder={placeholder}
                className="h-11"
                value={
                  typeof field.value === "number" && Number.isNaN(field.value)
                    ? ""
                    : (field.value ?? "")
                }
                onChange={(e) =>
                  field.onChange(
                    type === "number"
                      ? e.target.value === ""
                        ? NaN
                        : Number(e.target.value)
                      : e.target.value
                  )
                }
              />
            )}
            {description && (
              <FieldDescription id={`${id}-description`}>
                {description}
              </FieldDescription>
            )}
            {fieldState.error && (
              <FieldError id={`${id}-error`} errors={[fieldState.error]} />
            )}
          </Field>
        )
      }}
    />
  )
}
