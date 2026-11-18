"use client"
import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowRight, LoaderCircle, MailCheck } from "lucide-react"
import { z } from "zod"
import { login, register, forgotPassword, resetPassword } from "@/actions/auth"
import {
  loginSchema,
  registerSchema,
  forgotSchema,
  passwordSchema,
} from "@/lib/validation"
import { Form, FormField } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ActionResult } from "@/types/domain"

function FormFeedback({ result }: { result: ActionResult }) {
  return (
    <>
      {result.error && (
        <Alert variant="destructive">
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      )}
      {result.success && (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
          <MailCheck />
          <AlertDescription>{result.success}</AlertDescription>
        </Alert>
      )}
    </>
  )
}
function useAuthSubmit(action: (values: unknown) => Promise<ActionResult>) {
  const router = useRouter()
  const [result, setResult] = useState<ActionResult>({})
  return {
    result,
    submit: async (values: unknown) => {
      setResult({})
      try {
        const response = await action(values)
        setResult(response)
        if (response.redirectTo) {
          router.push(response.redirectTo)
        }
      } catch {
        setResult({ error: "Unable to connect. Please try again." })
      }
    },
  }
}
function Submit({
  pending,
  children,
}: {
  pending: boolean
  children: React.ReactNode
}) {
  return (
    <Button type="submit" disabled={pending} className="h-11 w-full gap-2">
      {pending ? <LoaderCircle className="animate-spin" /> : null}
      {children}
      {!pending && <ArrowRight />}
    </Button>
  )
}
export function LoginForm({ next }: { next?: string }) {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })
  const { result, submit } = useAuthSubmit((values) => login(values, next))
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <FormField
          control={form.control}
          name="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary"
          >
            Forgot password?
          </Link>
        </div>
        <FormFeedback result={result} />
        <Submit pending={form.formState.isSubmitting}>Sign in</Submit>
        <p className="pt-3 text-center text-sm text-muted-foreground">
          New to BoardingHub?{" "}
          <Link href="/register" className="font-medium text-primary">
            Create an account
          </Link>
        </p>
      </form>
    </Form>
  )
}
export function RegisterForm({
  role = "tenant",
}: {
  role?: "tenant" | "owner"
}) {
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      contact_number: "",
      password: "",
      confirm_password: "",
      role,
    },
  })
  const { result, submit } = useAuthSubmit(register)
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
        </div>
        <FormField
          control={form.control}
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
        <FormField
          control={form.control}
          name="contact_number"
          label="Contact number"
          type="tel"
          autoComplete="tel"
          placeholder="e.g. +63 917 123 4567"
        />
        <FormField
          control={form.control}
          name="role"
          label="I am joining as"
          options={[
            { value: "tenant", label: "Tenant — I am looking for a place" },
            { value: "owner", label: "Property Owner — I manage a property" },
          ]}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            description="At least 8 characters"
            required
          />
          <FormField
            control={form.control}
            name="confirm_password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
          />
        </div>
        <FormFeedback result={result} />
        <Submit pending={form.formState.isSubmitting}>Create account</Submit>
        <p className="pt-2 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary">
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
export function ForgotPasswordForm() {
  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  })
  const { result, submit } = useAuthSubmit(forgotPassword)
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          label="Email address"
          type="email"
          autoComplete="email"
          required
        />
        <FormFeedback result={result} />
        <Submit pending={form.formState.isSubmitting}>Send reset link</Submit>
        <Link href="/login" className="block text-center text-sm text-primary">
          Back to sign in
        </Link>
      </form>
    </Form>
  )
}
export function ResetPasswordForm() {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm_password: "" },
  })
  const { result, submit } = useAuthSubmit(resetPassword)
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <FormField
          control={form.control}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FormField
          control={form.control}
          name="confirm_password"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FormFeedback result={result} />
        <Submit pending={form.formState.isSubmitting}>Update password</Submit>
      </form>
    </Form>
  )
}
