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
  "../.seed-credentials.local.json",
  import.meta.url
)
const definitions = [
  {
    email: "admin@boardinghub.test",
    role: "admin",
    firstName: "Demo",
    lastName: "Administrator",
  },
  {
    email: "owner@boardinghub.test",
    role: "owner",
    firstName: "Demo",
    lastName: "Property Owner",
  },
  {
    email: "tenant@boardinghub.test",
    role: "tenant",
    firstName: "Demo",
    lastName: "Tenant",
  },
]

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

async function listUsers(admin) {
  const users = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error)
      throw new Error(
        `Unable to inspect Auth accounts (${error.code || error.status}).`
      )
    users.push(...data.users)
    if (data.users.length < 1000) return users
  }
}

function newCredentials(projectRef) {
  return {
    projectRef,
    generatedAt: new Date().toISOString(),
    instructions:
      "These are initial seeded logins. Change their passwords before real production use, then delete this file.",
    accounts: definitions.map(({ email, role }) => ({
      email,
      role,
      password: `${randomBytes(24).toString("base64url")}aA1!`,
      status: "pending_creation",
    })),
  }
}

function validateStoredCredentials(credentials, projectRef) {
  if (
    credentials.projectRef !== projectRef ||
    !Array.isArray(credentials.accounts) ||
    credentials.accounts.length !== definitions.length
  )
    throw new Error(
      "The saved seed credentials do not belong to this project or account set. Resolve the local file manually; no remote account was changed."
    )

  for (const definition of definitions) {
    const account = credentials.accounts.find(
      (item) => item.email === definition.email && item.role === definition.role
    )
    if (!account || typeof account.password !== "string")
      throw new Error(
        "The saved seed credentials are incomplete. No remote account was changed."
      )
  }
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

  const admin = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  let users = await listUsers(admin)
  let credentials

  if (existsSync(credentialsPath)) {
    credentials = JSON.parse(readFileSync(credentialsPath, "utf8"))
    validateStoredCredentials(credentials, projectRef)
  } else {
    const existingEmails = new Set(
      users.map((user) => user.email?.toLowerCase()).filter(Boolean)
    )
    if (definitions.some(({ email }) => existingEmails.has(email)))
      throw new Error(
        "A seeded email already exists without matching local credentials. Existing credentials were preserved; choose different seed emails or remove the accounts explicitly."
      )
    credentials = newCredentials(projectRef)
    // Save before creating Auth users so an interrupted run cannot lose a password.
    writeFileSync(
      credentialsPath,
      JSON.stringify(credentials, null, 2) + "\n",
      { encoding: "utf8", flag: "wx", mode: 0o600 }
    )
  }

  for (const definition of definitions) {
    const saved = credentials.accounts.find(
      (account) => account.email === definition.email
    )
    let user = users.find(
      (item) => item.email?.toLowerCase() === definition.email
    )

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email: definition.email,
        password: saved.password,
        email_confirm: true,
        user_metadata: {
          first_name: definition.firstName,
          last_name: definition.lastName,
          role: definition.role,
        },
      })
      if (error)
        throw new Error(
          `${definition.role} account creation failed (${error.code || error.status}). Credentials remain saved locally for a safe retry.`
        )
      user = data.user
      users.push(user)
      saved.status = "created"
      writeFileSync(
        credentialsPath,
        JSON.stringify(credentials, null, 2) + "\n"
      )
    }

    if (!user.email_confirmed_at)
      throw new Error(
        `The existing ${definition.role} account is not confirmed; it was preserved.`
      )

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .update({ role: definition.role })
      .eq("id", user.id)
      .eq("status", "active")
      .select("role,status")
      .single()
    if (
      profileError ||
      profile?.role !== definition.role ||
      profile.status !== "active"
    )
      throw new Error(
        `The ${definition.role} profile could not be verified as active.`
      )

    const client = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
    const { error: loginError } = await client.auth.signInWithPassword({
      email: definition.email,
      password: saved.password,
    })
    if (loginError)
      throw new Error(
        `Password login verification failed for the ${definition.role} account.`
      )
    try {
      const { data, error } = await client
        .from("profiles")
        .select("role,status")
        .eq("id", user.id)
        .single()
      if (error || data?.role !== definition.role || data.status !== "active")
        throw new Error(
          `Authenticated profile verification failed for the ${definition.role} account.`
        )
    } finally {
      await client.auth.signOut({ scope: "local" })
    }

    saved.status = "ready"
    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + "\n")
    console.log(`${definition.role} account ready: ${definition.email}`)
  }

  console.log(
    "All seeded logins were verified. Initial passwords are in .seed-credentials.local.json (ignored by Git)."
  )
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
