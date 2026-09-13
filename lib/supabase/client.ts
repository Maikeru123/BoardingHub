"use client"
import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/types/supabase"
import { getSupabaseConfig } from "./config"
export function createClient() {
  const { url, key } = getSupabaseConfig()
  return createBrowserClient<Database>(url, key)
}
