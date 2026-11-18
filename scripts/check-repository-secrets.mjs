import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { basename } from "node:path"
import { parseEnv } from "node:util"

// Report only locations and finding types. Never print matched values or Git blobs.
const git = (...args) =>
  execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 32 * 1024 * 1024,
  })
const known = []
for (const path of [
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.test.local",
  ".env.production.local",
]) {
  if (!existsSync(path)) continue
  for (const [name, value] of Object.entries(
    parseEnv(readFileSync(path, "utf8"))
  )) {
    if (value.length > 8 && name !== "NEXT_PUBLIC_SITE_URL")
      known.push([value, "local environment value"])
  }
}
for (const path of [
  ".admin-credentials.local.json",
  ".seed-credentials.local.json",
]) {
  if (!existsSync(path)) continue
  const saved = JSON.parse(readFileSync(path, "utf8"))
  if (saved.projectRef)
    known.push([saved.projectRef, "local seeded account configuration"])
  for (const account of saved.accounts || [saved]) {
    const secretFields = path.startsWith(".admin-")
      ? ["password", "email"]
      : ["password"]
    for (const name of secretFields)
      if (account[name])
        known.push([account[name], "local seeded account configuration"])
  }
}
const patterns = [
  ["Supabase API key", /\bsb_(?:publishable|secret)_[A-Za-z0-9_-]{16,}/],
  ["JWT credential", /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/],
  [
    "API/access token",
    /\b(?:sbp_|ghp_|gho_|github_pat_|sk_live_|sk-proj-)[A-Za-z0-9_-]{15,}/,
  ],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "authenticated connection string",
    /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s'"`]+:[^\s'"`]+@/,
  ],
  ["project-specific Supabase URL", /https:\/\/[a-z0-9]{20}\.supabase\.co/],
]
let findings = 0
function report(location, kind) {
  findings++
  console.log(`${location}: ${kind} (value withheld)`)
}
function scan(location, content) {
  if (content.includes("\0")) return
  content.split(/\r?\n/).forEach((line, index) => {
    const kinds = new Set()
    for (const [value, kind] of known) if (line.includes(value)) kinds.add(kind)
    for (const [kind, pattern] of patterns)
      if (pattern.test(line)) kinds.add(kind)
    for (const kind of kinds) report(`${location}:${index + 1}`, kind)
  })
}
try {
  const staged = process.argv.includes("--staged")
  const files = [
    ...new Set(
      git(
        "ls-files",
        "--cached",
        ...(staged ? [] : ["--others", "--exclude-standard"]),
        "-z"
      )
        .split("\0")
        .filter(Boolean)
    ),
  ]
  for (const file of files) {
    if (
      (basename(file).startsWith(".env") && file !== ".env.example") ||
      /(?:^|\/)\.(?:admin|seed)-credentials\.local/.test(file)
    )
      report(file, "local credential file is a commit candidate")
    if (staged) scan(`index:${file}`, git("show", `:${file}`))
    else if (existsSync(file)) scan(file, readFileSync(file, "utf8"))
  }
  if (process.argv.includes("--history")) {
    const commits = git("rev-list", "--all", "--reflog")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
    const seen = new Set()
    for (const commit of commits) {
      for (const line of git("ls-tree", "-r", commit).split(/\r?\n/)) {
        const match = /^\d+ blob ([a-f0-9]+)\t(.+)$/.exec(line)
        if (!match || seen.has(match[1])) continue
        seen.add(match[1])
        scan(
          `${commit.slice(0, 7)}:${match[2]}`,
          git("cat-file", "blob", match[1])
        )
      }
    }
    console.log(
      `Checked ${commits.length} reachable/reflog commits and ${seen.size} unique history blobs.`
    )
  }
  console.log(
    `Checked ${files.length} ${staged ? "staged" : "working tree"} files; ${findings} findings. Pattern and known-value scanning cannot prove that every possible secret is absent.`
  )
  process.exitCode = findings ? 1 : 0
} catch {
  console.error(
    "Repository scan could not complete; raw file and Git output withheld."
  )
  process.exitCode = 2
}
