# Repository security review

Reviewed on 2026-09-13. Credential values are deliberately omitted.

The review covered commit candidates, the Git index, local environment-file tracking, fetched Git history, hardcoded credential patterns, Supabase client configuration, and privileged seed/test scripts. This is a focused repository review, not a complete penetration test.

| Area | Finding and handling |
| --- | --- |
| `.gitignore` | Real `.env` files and variants, generated admin credentials, dependencies, Next/build output, coverage, logs, private-key files, database dumps, Supabase temporary state/backups, and browser authentication/test artifacts are excluded. |
| Versioned Supabase files | SQL migrations, `supabase/config.toml`, and trusted bootstrap/seed SQL remain versioned. The entire Supabase directory is not ignored. |
| README and examples | Project-specific URLs, project references, public keys, and administrator identifiers were replaced with placeholders or local configuration. No real private credentials belong in documentation. |
| Local configuration | `.env.local` and `.admin-credentials.local.json` are untracked and ignored. Their contents were preserved locally. |
| Application clients | Runtime Supabase clients use the public key and caller session. No service-role or secret key is embedded in application code or assigned to a public environment variable. |
| Administrator provisioning | The seed reads the project link and administrator email locally. The CLI administrative key stays in process memory. Initial passwords are randomly generated and saved only in the ignored credentials file. Existing passwords are preserved. SQL promotion requires a confirmed account with an active profile. |
| Test credentials | Validation fixtures use dummy passwords. Live browser tests generate temporary passwords and delete their own accounts, property, listing, and photos. No real password is hardcoded in tests. |
| Repeatable scan | `npm run check:secrets` checks commit candidates without printing values. `--staged` checks actual index contents, and `--history` checks fetched refs and local reflogs. Known local values and common token/private-key formats are detected; unfamiliar secret formats may require manual review. |

**Historical exposure requires action.** Commit `8c284f6` contains a real Supabase public publishable key in `.env.example`, plus a real project URL. The later remote commit removed current example values, but the earlier commit remains in history. Current documentation was also cleaned during this review. No service-role key, secret API key, database password, access token, or administrator password was found in the scanned commits.

A publishable key is intended for public clients and does not grant the elevated access of a secret/service-role key. RLS remains the authorization boundary. The repository owner's policy still requires real keys to stay out of the repository; replace the exposed publishable key in Supabase and update ignored local/hosting configuration. See [Supabase's API-key guidance](https://supabase.com/docs/guides/getting-started/api-keys).

Changing `.gitignore`, deleting a file, or pushing placeholders does **not** erase Git history or revoke a credential. Any private credential found in history must be revoked or rotated; history cleanup alone is insufficient. This update does not rewrite published history or rotate keys. See [GitHub's guidance on removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

Validation: all 18 ignore-rule checks passed and the placeholder environment template, Supabase configuration, and migrations remain commit candidates. The current-file credential scan found no remaining values. TypeScript, lint, validation/database tests, production build, and the live owner-to-admin workflow passed. `npm audit` reported zero known dependency vulnerabilities at review time. History scanning intentionally continues to flag the earlier public-key exposure until history is explicitly cleaned; replacing the key remains a separate provider action.
