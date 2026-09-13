# BoardingHub

Boarding house discovery and property management built with Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui (Base UI), Supabase, React Hook Form, and Zod.

Phase 1 includes authentication, profiles and roles, tenant/owner/admin dashboards, boarding houses, rooms, amenities, listings, private photos, and administrator verification. Rental requests, messages, rentals, payments, reviews, reports, and date-based availability remain outside this phase.

1. **Install and configure**

   Use Node.js 22 or newer. From this project directory, run:

   ```powershell
   npm ci
   Copy-Item .env.example .env.local
   ```

   Fill in `.env.local` before starting or building the app:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://ixueqmjobwzwkhcxktag.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PROJECT_ANON_KEY
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

   Use the project's public anon key. The app never needs a service role key or database password. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin in production. Public environment variables must also be present at build time. Without Supabase configuration, public pages show an honest setup/empty state and protected routes lead to sign-in.

2. **Apply the migrations to the existing project**

   The Supabase CLI is a locked development dependency. Authenticate using your own Supabase account and supply the database password when the CLI requests it:

   ```powershell
   npx supabase login
   npx supabase link --project-ref ixueqmjobwzwkhcxktag
   npx supabase db push --linked --dry-run
   npx supabase db push --linked
   npx supabase migration list --linked
   npm run db:types
   ```

   The migrations create all eight application tables, constraints, indexes, triggers, RLS, RPCs, amenities, and the private `listing-photos` bucket with its policies. Do not manually create the tables or bucket. The initial migrations expect those application tables not to exist already. Review existing migration history if the project has previously created them.

   `npm run db:types` replaces `types/database.ts` only after generation succeeds. Domain aliases are kept in `types/domain.ts` so generated types can be substituted directly.

3. **Configure hosted Supabase Authentication**

   In Supabase Authentication settings, enable email/password sign-up and email confirmations. Set the Site URL to the same origin as `NEXT_PUBLIC_SITE_URL`. Add these development redirect URLs, and their exact production equivalents:

   ```text
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/callback?next=/reset-password
   http://localhost:3000/auth/confirm
   http://localhost:3000/reset-password
   ```

   For confirmation and recovery links that also work when opened in another browser, configure the email templates with these links:

   Confirmation:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
   ```

   Password recovery:

   ```html
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
   ```

   The `/auth/callback` route also supports the normal PKCE code exchange. Neither callback accepts arbitrary external redirect destinations. Configure your SMTP provider for production email delivery. These hosted authentication settings are separate from schema migrations; `supabase/config.toml` configures local development.

4. **Bootstrap the first administrator**

   Register and confirm the intended account normally. Retrieve that account's exact UUID from Supabase Auth. In a trusted SQL Editor session, run the following after replacing the placeholder:

   ```sql
   update public.profiles
   set role = 'admin', status = 'active'
   where id = 'REPLACE_WITH_CONFIRMED_AUTH_USER_UUID'::uuid
   returning id, first_name, last_name, role;
   ```

   Alternatively, with PostgreSQL's `psql` client installed and a database connection string configured only in your terminal:

   ```powershell
   psql "$env:SUPABASE_DB_URL" -v admin_id="CONFIRMED_AUTH_USER_UUID" -f supabase/bootstrap-admin.sql
   ```

   No public registration, profile update, user metadata, or administrator UI can assign an admin role. The Auth trigger accepts `tenant`/`owner` and maps every other requested role to `tenant`. The trigger inserts the profile in the same transaction as the Auth user, so registration cannot succeed with a missing profile. Existing Auth users are backfilled by the first migration.

5. **Run locally**

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000`. For a local Supabase stack instead of the hosted project, install and start Docker Desktop, then run:

   ```powershell
   npx supabase start
   npx supabase db reset --local
   npx supabase status
   ```

   The reset command recreates the local database and deletes its local data. Use the local API URL and public anon key printed by the CLI in `.env.local`. Local email messages are available at `http://localhost:54324`. Never copy a service role key into any `NEXT_PUBLIC_` variable.

6. **Verify changes**

   ```powershell
   npm run typecheck
   npm run lint
   npm test
   npm run build
   npm run test:e2e
   ```

   Browser tests use installed Microsoft Edge on Windows. On other platforms, run `npx playwright install chromium` first. Override the browser with `PLAYWRIGHT_CHANNEL` if needed. Playwright starts a production server on port 3100, so build before running it. Run this public smoke suite against a build with no configured Supabase credentials; it does not send email or create accounts.

   The database suite runs the actual SQL migrations under PostgreSQL through PGlite. It supplies minimal Supabase-owned Auth/Storage scaffolding and switches database roles to check RLS. It does not replace testing GoTrue email delivery, Storage HTTP uploads, cookie refresh, and authenticated browser flows against the configured Supabase project.

The [Phase 1 completion report](docs/phase-1-report.md) contains the route inventory, RLS summary, validation results, and live testing checklist. The [file inventory](docs/phase-1-files.md) lists created and modified files.
