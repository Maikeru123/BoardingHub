import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
const cliEntry = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url)
)
const result = spawnSync(
  process.execPath,
  [cliEntry, "gen", "types", "typescript", "--linked", "--schema", "public"],
  { encoding: "utf8" }
)
if (result.status !== 0 || !result.stdout.includes("export type Database")) {
  process.stderr.write(
    result.stderr || "Type generation failed. Existing types were preserved.\n"
  )
  process.exit(1)
}
writeFileSync(
  new URL("../types/database.ts", import.meta.url),
  result.stdout,
  "utf8"
)
console.log("Updated types/database.ts from the linked Supabase project.")
