import "server-only"
import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
import type { Role } from "@/types/domain"

export const getSessionProfile = cache(async () => {
  if (!isSupabaseConfigured()) return null
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()
  if (profileError || !profile) redirect("/account-unavailable?reason=profile")
  return { user, profile, supabase }
})

// Called by every protected data function/page and every mutation, not only layouts.
export async function requireRole(role?: Role) {
  if (!isSupabaseConfigured()) redirect("/login?notice=configuration")
  const session = await getSessionProfile()
  if (!session) redirect("/login")
  if (session.profile.status !== "active")
    redirect("/account-unavailable?reason=suspended")
  if (!["tenant", "owner", "admin"].includes(session.profile.role))
    redirect("/account-unavailable")
  if (role && session.profile.role !== role)
    redirect(`/${session.profile.role}`)
  return session
}
