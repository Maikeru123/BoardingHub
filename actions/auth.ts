"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import { requireRole } from "@/lib/auth"
import {
  forgotSchema,
  loginSchema,
  passwordSchema,
  profileSchema,
  registerSchema,
} from "@/lib/validation"
import { databaseError } from "@/lib/action-errors"
import type { ActionResult } from "@/types/domain"

function siteOrigin() {
  const url = process.env.NEXT_PUBLIC_SITE_URL
  if (!url && process.env.NODE_ENV === "production") return null
  return new URL(url || "http://localhost:3000").origin
}
const configurationError = {
  error:
    "Account services are not connected yet. Please try again once setup is complete.",
}
export async function login(values: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (!isSupabaseConfigured()) return configurationError
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error)
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirm your email before signing in."
          : "Unable to sign in. Check your email and password and try again.",
    }
  revalidatePath("/", "layout")
  return { redirectTo: "/dashboard" }
}
export async function register(values: unknown): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (!isSupabaseConfigured() || !siteOrigin()) return configurationError
  const { email, password, first_name, last_name, contact_number, role } =
    parsed.data
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteOrigin()}/auth/callback`,
      data: { first_name, last_name, contact_number, role },
    },
  })
  if (error)
    return {
      error:
        error.code === "over_email_send_rate_limit"
          ? "Too many attempts. Please wait a few minutes before trying again."
          : "We could not create your account. Try again, or sign in if you already have an account.",
    }
  // The auth.users trigger creates the profile in the same database transaction.
  if (data.session) return { redirectTo: "/dashboard" }
  return {
    success:
      "Check your email for a confirmation link. If you already have an account, you can sign in instead.",
  }
}
export async function forgotPassword(values: unknown): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  if (!isSupabaseConfigured() || !siteOrigin()) return configurationError
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password` }
  )
  if (error)
    return {
      error:
        "We could not send a reset link. Please wait a few minutes and try again.",
    }
  return {
    success:
      "If an account uses that email, a password reset link is on its way. Check your inbox and spam folder.",
  }
}
export async function resetPassword(values: unknown): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { supabase } = await requireRole()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (error)
    return {
      error:
        "The password could not be updated. Try a different password or request a new reset link.",
    }
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  return { redirectTo: "/login?notice=password-updated" }
}
export async function updateProfile(values: unknown): Promise<ActionResult> {
  const { supabase, user } = await requireRole()
  const parsed = profileSchema.safeParse(values)
  if (!parsed.success) return { error: parsed.error.issues[0].message }
  const { error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      contact_number: parsed.data.contact_number || null,
    })
    .eq("id", user.id)
  if (error) return { error: databaseError(error) }
  revalidatePath("/", "layout")
  return { success: "Your profile has been updated." }
}
export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  revalidatePath("/", "layout")
  redirect("/login")
}
