import { spawnSync } from "node:child_process"
import { randomBytes } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { parseEnv } from "node:util"
import { createClient } from "@supabase/supabase-js"

const root = fileURLToPath(new URL("../", import.meta.url))
const cli = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url)
)
const credentialsPath = new URL(
  "../.admin-credentials.local.json",
  import.meta.url
)

function runCli(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 60_000,
    windowsHide: true,
  })
  // CLI output may contain administrative keys; never echo it on errors.
  if (result.status !== 0)
    throw new Error(
      `Supabase CLI ${args.slice(0, 2).join(" ")} failed. Check CLI login and project access.`
    )
  try {
    return JSON.parse(result.stdout)
  } catch {
    throw new Error("Unexpected Supabase CLI response; raw output withheld.")
  }
}

function query(sql) {
  return runCli(["db", "query", "--linked", sql]).rows
}

async function main() {
  const projectRef = readFileSync(
    new URL("../supabase/.temp/project-ref", import.meta.url),
    "utf8"
  ).trim()
  const env = parseEnv(
    readFileSync(new URL("../.env.local", import.meta.url), "utf8")
  )
  const url = `https://${projectRef}.supabase.co`
  if (
    !/^[a-z0-9]{20}$/.test(projectRef) ||
    env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") !== url
  )
    throw new Error(
      "The CLI link and .env.local must both target the BoardingHub project."
    )
  if (!env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    throw new Error("Set the public Supabase key in .env.local first.")
  const email = env.BOARDINGHUB_ADMIN_EMAIL?.trim().toLowerCase()
  if (
    !email ||
    email === "admin@example.com" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new Error(
      "Set BOARDINGHUB_ADMIN_EMAIL in .env.local to the intended administrator's email."
    )
  const seedEmail = email.replaceAll("'", "''")

  const accounts = query(`
    select u.id, u.email_confirmed_at is not null as confirmed, p.status
    from auth.users u left join public.profiles p on p.id = u.id
    where lower(u.email) = '${seedEmail}';
  `)
  if (accounts.length > 1)
    throw new Error("Multiple matching Auth accounts; seed stopped.")
  if (
    accounts[0] &&
    (!accounts[0].confirmed || accounts[0].status !== "active")
  )
    throw new Error(
      "The existing account must be confirmed and active. Its credentials and status were preserved."
    )

  let password
  let credentials
  if (accounts.length === 0) {
    const keys = runCli([
      "projects",
      "api-keys",
      "--project-ref",
      projectRef,
      "--reveal",
      "--output",
      "json",
    ])
    const key =
      keys.find((item) => item.type === "secret")?.api_key ||
      keys.find((item) => item.name === "service_role")?.api_key
    if (!key)
      throw new Error(
        "No administrative API key is available for Auth provisioning."
      )

    password = `${randomBytes(24).toString("base64url")}aA1!`
    credentials = {
      email,
      password,
      projectRef,
      status: "pending_creation",
      instructions:
        "Sign in at /login, then visit /reset-password to choose your own password. Delete this file afterward. This seed never resets an existing password.",
    }
    // Save before creating the account so a failed disk write cannot lose its password.
    // Exclusive creation preserves any credentials from an earlier run.
    writeFileSync(
      credentialsPath,
      JSON.stringify(credentials, null, 2) + "\n",
      {
        encoding: "utf8",
        flag: "wx",
        mode: 0o600,
      }
    )
    const admin = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: "Administrator", last_name: "Account" },
    })
    if (error)
      throw new Error(
        `Auth account creation failed (${error.code || error.status}). Local credentials are still marked pending; no admin role was assigned.`
      )
    credentials.status = "created"
    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + "\n")
  }

  // The email is local configuration, scoped to this trusted transaction.
  query(`begin;
    select set_config('boardinghub.seed_admin_email', '${seedEmail}', true);
    ${readFileSync(new URL("../supabase/seed-admin.sql", import.meta.url), "utf8")}
    commit;`)
  const [profile] = query(`
    select u.id, u.email, p.role, p.status
    from auth.users u join public.profiles p on p.id = u.id
    where lower(u.email) = '${seedEmail}';
  `)
  if (profile?.role !== "admin" || profile.status !== "active")
    throw new Error("Admin role verification failed.")

  // Resume login verification if an earlier run created Auth but stopped at SQL.
  if (!password && existsSync(credentialsPath)) {
    const saved = JSON.parse(readFileSync(credentialsPath, "utf8"))
    if (
      saved.email === email &&
      saved.projectRef === projectRef &&
      saved.status === "created" &&
      typeof saved.password === "string"
    ) {
      credentials = saved
      password = saved.password
    }
  }
  if (password) {
    const client = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    const { error } = await client.auth.signInWithPassword({ email, password })
    if (error)
      throw new Error(
        "Admin created, but password login verification failed. Credentials are saved locally."
      )
    try {
      const { data, error: profileError } = await client
        .from("profiles")
        .select("role,status")
        .eq("id", profile.id)
        .single()
      if (profileError || data?.role !== "admin" || data.status !== "active")
        throw new Error("Authenticated admin profile verification failed.")
    } finally {
      await client.auth.signOut({ scope: "local" })
    }
    credentials.status = "ready"
    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + "\n")
    console.log("Password login and authenticated admin profile verified.")
    console.log(
      "Initial password saved in .admin-credentials.local.json (ignored by Git)."
    )
  } else {
    console.log(
      "Existing account preserved; its password and profile details were not changed."
    )
  }
  console.log("Administrator account ready.")
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
