import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  if (code && isSupabaseConfigured()) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const next =
        request.nextUrl.searchParams.get("next") === "/reset-password"
          ? "/reset-password"
          : "/dashboard"
      return NextResponse.redirect(new URL(next, request.url), {
        headers: { "Cache-Control": "private, no-store" },
      })
    }
  }
  return NextResponse.redirect(
    new URL("/login?notice=invalid-link", request.url)
  )
}
