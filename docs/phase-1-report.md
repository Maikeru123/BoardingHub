# BoardingHub Phase 1 completion report

Phase 1 is implemented. On 2026-09-13, both migrations were applied to the linked Supabase project after the implementation was pushed to GitHub as commit `8c284f6`. The private photo bucket and schema are provisioned, and the configured public API connection has been verified. Hosted Auth/email delivery still requires deployment-specific configuration. No Phase 2 workflows were implemented.

1. **Files created**

   See the exact [created and modified file inventory](phase-1-files.md). New code is organized into `actions/`, `lib/supabase/`, `lib/auth.ts`, `lib/data.ts`, `lib/validation.ts`, `types/`, `hooks/`, reusable `components/`, App Router route groups, `supabase/`, and `tests/`.

   Server Components render data by default. Client components handle forms, navigation interaction, theme switching, dialogs, uploads, and notifications. Form components adapt the current shadcn Field components to React Hook Form and Zod, following the [current shadcn form guidance](https://ui.shadcn.com/docs/forms/react-hook-form).

2. **Files modified**

   `app/page.tsx` now provides the public discovery entrypoint using the existing property photos. `app/layout.tsx` adds metadata, local Geist fonts, a skip link, and Sonner. `app/globals.css` adds the blue property-management theme and form styles. `next.config.ts` permits uploads within a 6 MB Server Action envelope; actual files are limited to 5 MB. `eslint.config.mjs` uses the official compatibility adapter for the starter's ESLint 10 and Next.js React plugins. `package.json`, `package-lock.json`, `.gitignore`, and `README.md` contain dependencies, checks, setup, and ignore rules.

   The existing shadcn configuration, button, theme provider, utility, and user-supplied image files were preserved. The initial untracked images are not counted as files created by this implementation.

3. **Migration files created**

   - `supabase/migrations/202609120001_phase_one_schema.sql`: eight tables, profile registration/backfill, enum-like checks, positive rent and capacity constraints, foreign keys, indexes, timestamps, ownership helpers, RLS, protected relationships, review invalidation, and seeded amenities.
   - `supabase/migrations/202609120002_workflows_and_storage.sql`: transactional property/amenity save, submission, review, account status and photo RPCs, private bucket, and Storage policies.

   Profiles use the Auth UUID and contain no passwords. Owned properties restrict profile deletion; rooms, amenities links, listings, photos, and review history cascade with their parent records. Removing an administrator preserves verification history and nulls its administrator reference. A room number is unique within its property when supplied. Each listing has at most one primary image and one pending review.

4. **Storage bucket created/required**

   `listing-photos` was created remotely by migration 002. It is private, allows JPEG/PNG/WebP, and limits each image to 5 MB. Object paths are `<owner UUID>/<listing UUID>/<random UUID>.<extension>`. Uploads validate image signatures server-side. Listings support up to 12 photos, primary selection, and removal with automatic primary replacement.

   Storage RLS verifies ownership and editable listing status. No object-update policy permits replacing an approved image. Public access is limited to photos linked to published listings on active properties belonging to active owners. Pages obtain signed URLs valid for five minutes and do not send private images through Next's shared image optimizer. An already-issued signed URL can remain valid until it expires after a listing is withdrawn or an owner is suspended.

   Database transactions and object storage are separate systems. Failed metadata saves attempt upload cleanup. Failed object deletion after metadata removal is logged as an orphan for maintenance; the image is removed from the listing. Direct SQL/API deletion of parent records can also leave unreferenced objects, which remain outside public reads. The management UI uses deactivation instead of hard deletion.

5. **RLS policies and authorization**

   | Resource | Public / tenant reads | Owner writes | Administrator access |
   | --- | --- | --- | --- |
   | Profiles | Authenticated users read their own profile | Own first name, last name, and contact only while active | Read profiles; change account status through checked RPC; cannot self-suspend |
   | Boarding houses | Active houses with a published listing and active owner | Own properties only; cannot change owner or self-assign suspended status | Read all for administration/review |
   | Rooms | Available rooms under public houses | Only rooms under owned properties; immutable parent | Read all for review |
   | Amenities | Shared catalog | Select associations on owned properties | Read catalog and associations |
   | House amenities | Associations on public houses | Add/remove on owned properties | Read all for review |
   | Listings | Published listings on public houses | Create draft, edit/delete own draft or rejected records; submit only through RPC | Read all; approve/reject/request correction through RPC |
   | Listing photos | Photos associated with public listings | Checked RPCs on own editable listings | Read for review |
   | Verifications | No public/tenant access | Read own listing's complete history | Read and record review decisions through RPC |
   | Storage objects | Public listing images through authorized signed URLs | Upload/delete in own editable listing folder | Read listing images for review |

   Each application table has RLS enabled. There are no blanket authenticated-user write policies. Column grants prevent role/status elevation through profile updates. Definer functions have fixed empty search paths, explicit identity checks, and restricted execute grants. No service role key is used anywhere in application code.

   `proxy.ts` refreshes cookies, while the server data layer verifies the current Auth user and active profile on protected pages and actions. Role mismatches redirect to the user's correct dashboard. Layout checks are supplemented by checks in pages/data functions and every mutation, as required by the installed Next.js guide. Supabase client/session utilities follow the [official SSR client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs).

   Approval updates the pending verification and publishes the listing atomically. Rejection sets `rejected`; correction sets the verification to `for_correction` and returns the listing to `draft` with remarks. Resubmission creates a new history record. Changes to the parent house, rooms, or amenities withdraw published/submitted listings and close any pending verification with correction remarks, including changes made through the database API.

6. **Routes created**

   | Area | Routes |
   | --- | --- |
   | Public | `/`, `/listings`, `/listings/[id]` |
   | Authentication | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/auth/callback`, `/auth/confirm`, `/dashboard`, `/account-unavailable` |
   | Tenant | `/tenant`, `/tenant/listings`, `/tenant/listings/[id]`, `/tenant/profile` |
   | Owner | `/owner`, `/owner/profile`, `/owner/boarding-houses`, `/owner/boarding-houses/new`, `/owner/boarding-houses/[id]/edit`, `/owner/rooms`, `/owner/rooms/new`, `/owner/rooms/[id]/edit`, `/owner/listings`, `/owner/listings/new`, `/owner/listings/[id]`, `/owner/listings/[id]/edit`, `/owner/verifications` |
   | Admin | `/admin`, `/admin/profile`, `/admin/users`, `/admin/boarding-houses`, `/admin/listings`, `/admin/verifications`, `/admin/verifications/[id]` |

   `/` was replaced; the other routes are new. Root and dashboard loading/error boundaries, 404 handling, empty states, Skeletons, alert dialogs, Sonner, breadcrumbs, mobile navigation, and account menus are included. Tenant rental requests, active rentals, and messages are explicitly marked coming soon. Public listing search matches titles and is paginated; admin account browsing is paginated.

7. **Environment variables required**

   - `NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<developer-configured public anon key>`
   - `NEXT_PUBLIC_SITE_URL=http://localhost:3000` locally, or the production HTTPS origin for email redirects.

   Real configuration is kept in ignored `.env.local`. Examples contain placeholders only. `NEXT_PUBLIC_SUPABASE_ANON_KEY` accepts a public publishable key as well as a legacy anon key. `BOARDINGHUB_ADMIN_EMAIL` configures the trusted seed script locally. CLI credentials remain outside version control.

8. **Remaining manual Supabase setup**

   The local public key, CLI link, migrations, and bucket provisioning are complete. Set hosted email authentication, Site URL, redirect allowlist, and confirmation/recovery email templates as described in the [README](../README.md). Configure production SMTP. Run `npm run db:seed:admin` to provision the locally configured administrator through the trusted CLI and Auth Admin API. The seed stores a generated initial password only in the Git-ignored `.admin-credentials.local.json`, preserves existing credentials, and refuses unconfirmed or suspended existing accounts. Additional administrators can be promoted by exact confirmed Auth UUID through `supabase/bootstrap-admin.sql`. No table or bucket needs manual dashboard creation.

9. **Exact migration commands**

   Run from the project directory:

   ```powershell
   npm ci
   npx supabase login
   npx supabase link --project-ref your-project-id
   npx supabase db push --linked --dry-run
   npx supabase db push --linked
   npx supabase migration list --linked
   npm run db:types
   ```

   Supply the database password through the CLI prompt. The app itself does not use it. Local Docker-based reset and administrator bootstrap alternatives are documented in the README.

10. **Verification results and testing checklist**

    Completed locally: `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass. Tests include three validation tests and thirteen database scenarios (fourteen reported tests including the parent suite), plus eight passing Playwright checks across desktop and mobile. Browser coverage includes responsive overflow checks, navigation/search, registration account types and password mismatch validation, anonymous protected-route redirects, password recovery navigation, invalid callback redirects, and 404s. The database suite uses PGlite with minimal Supabase Auth/Storage scaffolding.

    Live migration verification on 2026-09-13: both migration versions appear in remote history. Public API checks using the developer's configured key returned all eight amenities and confirmed that public tables are reachable, private profile/verification records are denied, and anonymous administrator review is denied. TypeScript types were regenerated from the remote schema; the nullable property-creation RPC contract is preserved in `types/supabase.ts`. The project had zero Auth users before migration, so no user accounts were changed.

    Administrator provisioning on 2026-09-13: the explicit seed created the configured administrator with an active admin profile. Password sign-in and reading that admin profile with the public API key and authenticated user session succeeded. The generated initial password is stored only in the Git-ignored local credentials file. The database suite also verifies that this seed rejects missing, unconfirmed, or suspended accounts, denies execution by application users, and leaves an existing admin profile unchanged on repeat runs.

    Live listing workflow regression on 2026-09-13: a temporary owner saved a draft and reached its details page in approximately 1.4 seconds; the owner and admin both saw the draft immediately on their listing pages. The test uploaded a photo, submitted the listing, verified it appeared in the admin pending queue with its photo, requested a correction, and verified the owner received the remarks. All temporary records and accounts were removed. Saving a draft now explicitly leads to photo upload and a submission checklist; duplicate client refreshes after saves/sign-in were removed. See `npm run test:e2e:workflow` for the repeatable test.

    After configuring the live or local Supabase stack:

    - [ ] Register a tenant and two owners. Confirm emails and verify matching `profiles.id` values and dashboard redirects.
    - [ ] Confirm that registration/profile metadata cannot create an admin and that direct role/status updates fail.
    - [ ] Check tenant → `/owner`/`/admin` and owner → `/admin` redirects, including nested URLs and direct Server Action attempts.
    - [ ] Refresh an authenticated page after token expiration; verify refreshed cookies and retained session. Sign out and revisit a protected URL.
    - [ ] Complete password reset through a real email link, including a link opened in another browser; confirm old credentials no longer work.
    - [ ] Add/edit/deactivate properties, addresses, rules, and amenities; verify invalid coordinates/contact inputs and another owner's IDs are rejected.
    - [ ] Add/edit rooms and change prices, types, capacities, and statuses; verify duplicate room numbers and invalid numeric values fail.
    - [ ] Create a draft, upload valid/invalid/oversized photos, choose a primary image, remove it, and verify automatic replacement and ownership restrictions.
    - [ ] Submit a listing with missing requirements and then with all requirements; verify a single pending record and locked listing/photo editing.
    - [ ] As admin, inspect photos, property details, rooms, rules, and amenities; request a correction with remarks, then have the owner fix and resubmit.
    - [ ] Reject and resubmit a listing, then approve it. Verify history is retained and approval atomically publishes it.
    - [ ] As tenant/anonymous visitor, verify only public active properties, available rooms, and published listing images can be read.
    - [ ] Change an approved property's room, amenities, or address. Verify it disappears publicly until resubmitted and approved.
    - [ ] Suspend an owner and verify workspace mutations and new public reads fail. Reactivate and verify expected visibility. Verify admins cannot suspend themselves.
    - [ ] Test concurrent review/submission/primary-photo actions on the real database; check integrity and understandable conflict responses.
    - [ ] Exercise mobile dashboard navigation, account menu, theme toggle, keyboard focus, inline errors, empty states, and notifications with authenticated accounts.

    Room status remains general usability, not future date-based booking availability. No inquiry, request, transaction, payment, review, report, feedback, or date-availability system was added.
