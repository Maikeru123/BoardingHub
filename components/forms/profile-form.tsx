"use client"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateProfile } from "@/actions/auth"
import { profileSchema } from "@/lib/validation"
import { Form, FormField } from "@/components/ui/form"
import { FormSection, FormFooter } from "./editor"
import { useActionResult } from "@/hooks/use-action-result"
import type { Profile } from "@/types/domain"
export function ProfileForm({
  profile,
  email,
}: {
  profile: Profile
  email: string
}) {
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile.first_name,
      last_name: profile.last_name,
      contact_number: profile.contact_number || "",
    },
  })
  const { run, error } = useActionResult()
  return (
    <Form {...form}>
      <form
        className="max-w-3xl space-y-6"
        onSubmit={form.handleSubmit(async (values) => {
          await run(() => updateProfile(values))
        })}
      >
        <FormSection
          title="Personal information"
          description={`Signed in as ${email}`}
        >
          <FormField
            control={form.control}
            name="first_name"
            label="First name"
            autoComplete="given-name"
            required
          />
          <FormField
            control={form.control}
            name="last_name"
            label="Last name"
            autoComplete="family-name"
            required
          />
          <FormField
            control={form.control}
            name="contact_number"
            label="Contact number"
            type="tel"
            autoComplete="tel"
          />
        </FormSection>
        <FormFooter
          pending={form.formState.isSubmitting}
          error={error}
          cancel={`/${profile.role}`}
        />
      </form>
    </Form>
  )
}
