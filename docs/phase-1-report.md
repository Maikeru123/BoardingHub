# BoardingHub Phase 1 revision and audit report

The Phase 1 photo, address, map, database, authorization, and rendering revision was completed locally on 2026-09-29. No Phase 2 workflow was added. The revision migration has **not** been applied to the linked hosted Supabase project from this environment: both the CLI migration dry run and the read-only remote audit failed before a database connection could be established. Apply and inspect the migration as described under **Manual deployment** before using the configured hosted project with this build.

## Implemented revision

- Property photos now belong to `boarding_houses` through `boarding_house_photos`; listing forms contain no photo controls.
- Owners can upload multiple JPEG/PNG/WebP files, preview selections, observe batch progress, choose a primary photo, replace photos, and remove photos with confirmation. The limit is 12 files per property and 5 MB per file.
- Listing cards, listing details, owner tables, and administrator review pages use the related property's primary photo and render a neutral fallback when none exists.
- The boarding-house form now uses searchable cascading Province → City/Municipality → Barangay controls. It stores canonical names and ten-digit PSGC codes, resets dependent fields, validates the hierarchy again on the server, and never asks for latitude or longitude.
- `lib/locations/philippines.ts` isolates the data provider. It uses the bundled `@ianlabicani/geoph-lite` Second Quarter 2026 PSGC snapshot and lazy-loads region files locally, so the form has no runtime location-API or TLS dependency. NCR and the BARMM Special Geographic Area are exposed as province-equivalent choices; independent cities are grouped under their commonly associated host province while their official locality/barangay codes remain unchanged.
- `LocationDisplay` always shows the structured address. Existing valid internal coordinates produce an OpenStreetMap embed with attribution; otherwise it gives an OpenStreetMap address-search link. Saving does not depend on geocoding and no additional API key is required.

## Database and migration

`supabase/migrations/202609290001_house_photos_and_psgc_locations.sql`:

- renames `boarding_houses.city` to `city_municipality` and adds postal-code and PSGC-code columns;
- leaves existing latitude/longitude columns nullable for future geocoding;
- creates `boarding_house_photos`, its foreign key/indexes, and a partial unique index that permits only one primary photo per property;
- migrates every legacy photo ID, path, timestamp, and property relationship before dropping `listing_photos`;
- deterministically chooses one primary when a property had photos on multiple listings;
- creates the private `boarding-house-photos` bucket and property-scoped Storage policies;
- keeps the old bucket private for migrated object compatibility; after verifying no metadata uses legacy paths, an empty bucket may be removed through the Storage API or Dashboard rather than direct SQL;
- replaces listing-photo RPCs with property-photo RPCs and invalidates pending/published review state when reviewed property photos change;
- changes legacy `approved` listing states to `published`, tightens status consistency, and updates submission/property-save RPCs for the new requirements;
- prevents client-side hard deletion of properties so Storage objects cannot be orphaned through a cascading table delete.

The migration test executes the two legacy migrations, inserts photos across two listings for one property, applies the revision, and verifies preservation of every row/object reference plus deterministic primary selection. The normal database suite executes all migrations in PostgreSQL-compatible PGlite and tests all eight RLS-enabled application tables.

## Authorization, RLS, and workflow audit

- Public registration accepts only `tenant` and `owner`; metadata cannot create an administrator. The trusted seed remains the administrator bootstrap route.
- Protected tenant, owner, and administrator layouts check the authenticated user and active profile on the server. Mutations repeat role/ownership checks and database RLS remains the final enforcement layer.
- Owners cannot read or mutate another owner's private property, rooms, photos, listing, or submission. Tenants cannot perform owner/admin writes. Owners cannot self-publish or create verification decisions.
- Storage write policy validates the authenticated owner ID, owned property ID, exact generated path shape, active profile/property state, MIME allowlist, and bucket size limit. Public reads require a published listing on an active property owned by an active account.
- Submission requires a complete validated PSGC hierarchy, at least one room, and a primary property photo. Approval atomically records an approved verification and publishes the listing. Rejection/correction remain visible to the owner, and resubmission retains verification history.
- Changes to reviewed property details, rooms, amenities, or property photos withdraw pending/published content for review.
- The database suite also verifies account suspension, primary uniqueness/replacement, direct cross-owner denial, immutable relationships, administrator review, and secure administrator seeding.

## Rendering and UI fixes

- Supabase types, domain types, data queries, signed-photo URL handling, and all components now use the property-photo schema.
- Query errors are checked instead of silently rendering incomplete management/review screens.
- Location requests use abort controllers and stale-response guards. Cascading fields expose loading, empty, disabled, validation, and provider-failure states.
- File previews are revoked, invalid selections can be selected again after correction, and replacement does not count as a new photo against the limit.
- Shared action buttons explicitly use `type="button"`, preventing accidental surrounding-form submissions.
- The implementation follows the installed Next.js 16.3.4 guidance for Server/Client Components, route handlers, async route parameters, cookies, proxy/session refresh, forms, images, and Server Actions.

## Verification results

- `npm run typecheck`: pass
- `npm run lint`: pass
- `npm test`: pass (3 validation tests and 15 reported database/migration tests)
- `npm run build`: pass
- public Playwright smoke suite with Supabase intentionally unconfigured: 8/8 pass across desktop and mobile
- built location-route smoke: local PSGC data covers Cebu, Davao City under Davao del Sur, NCR, and Manila's 897 barangays without a network request
- configured hosted-project browser smoke: 6/8 public checks pass; home/search fail because the hosted database still lacks `boarding_house_photos`
- linked live owner/admin workflow: not run because the revision migration could not be reached/applied from this environment

The browser runner prints a harmless `NO_COLOR`/`FORCE_COLOR` warning and, on this Windows host, does not exit automatically after reporting all tests; it was stopped after results were recorded. The configured smoke failure is an expected deployment mismatch, not a passing end-to-end result.

## Manual deployment

From an environment that can reach the linked Supabase database:

```powershell
npx supabase migration list --linked
npx supabase db push --linked --dry-run
npx supabase db push --linked
npm run db:types
npm run build
npm run test:e2e:workflow
```

Inspect the dry run and take a database/Storage backup first. After the push, verify the legacy-photo row count and object availability before removing any retained `listing-photos` objects or bucket through the Storage API or Dashboard. No location/map API key or manual Storage bucket creation is needed. Hosted Auth Site URL, redirect allowlist, email templates/SMTP, and the trusted administrator seed described in the README remain deployment-specific configuration.
