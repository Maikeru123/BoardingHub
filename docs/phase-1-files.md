# Phase 1 file inventory

Paths are relative to the repository root. The four pre-existing untracked files in `public/` were preserved and are excluded from this inventory.

**Modified files (9)**

- `.gitignore`
- `README.md`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `eslint.config.mjs`
- `next.config.ts`
- `package-lock.json`
- `package.json`

**Created files (110)**

- `.env.example`
- `actions/auth.ts`
- `actions/listings.ts`
- `actions/photos.ts`
- `actions/properties.ts`
- `app/(auth)/forgot-password/page.tsx`
- `app/(auth)/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/(auth)/register/page.tsx`
- `app/(auth)/reset-password/page.tsx`
- `app/(dashboards)/admin/boarding-houses/page.tsx`
- `app/(dashboards)/admin/layout.tsx`
- `app/(dashboards)/admin/listings/page.tsx`
- `app/(dashboards)/admin/page.tsx`
- `app/(dashboards)/admin/profile/page.tsx`
- `app/(dashboards)/admin/users/page.tsx`
- `app/(dashboards)/admin/verifications/[id]/page.tsx`
- `app/(dashboards)/admin/verifications/page.tsx`
- `app/(dashboards)/error.tsx`
- `app/(dashboards)/loading.tsx`
- `app/(dashboards)/owner/boarding-houses/[id]/edit/page.tsx`
- `app/(dashboards)/owner/boarding-houses/new/page.tsx`
- `app/(dashboards)/owner/boarding-houses/page.tsx`
- `app/(dashboards)/owner/layout.tsx`
- `app/(dashboards)/owner/listings/[id]/edit/page.tsx`
- `app/(dashboards)/owner/listings/[id]/page.tsx`
- `app/(dashboards)/owner/listings/new/page.tsx`
- `app/(dashboards)/owner/listings/page.tsx`
- `app/(dashboards)/owner/page.tsx`
- `app/(dashboards)/owner/profile/page.tsx`
- `app/(dashboards)/owner/rooms/[id]/edit/page.tsx`
- `app/(dashboards)/owner/rooms/new/page.tsx`
- `app/(dashboards)/owner/rooms/page.tsx`
- `app/(dashboards)/owner/verifications/page.tsx`
- `app/(dashboards)/tenant/layout.tsx`
- `app/(dashboards)/tenant/listings/[id]/page.tsx`
- `app/(dashboards)/tenant/listings/page.tsx`
- `app/(dashboards)/tenant/page.tsx`
- `app/(dashboards)/tenant/profile/page.tsx`
- `app/account-unavailable/page.tsx`
- `app/auth/callback/route.ts`
- `app/auth/confirm/route.ts`
- `app/dashboard/page.tsx`
- `app/error.tsx`
- `app/listings/[id]/page.tsx`
- `app/listings/page.tsx`
- `app/loading.tsx`
- `app/not-found.tsx`
- `components/action-button.tsx`
- `components/auth/auth-form.tsx`
- `components/dashboard/navigation.tsx`
- `components/dashboard/shell.tsx`
- `components/forms/editor.tsx`
- `components/forms/house-form.tsx`
- `components/forms/listing-form.tsx`
- `components/forms/profile-form.tsx`
- `components/forms/review-form.tsx`
- `components/forms/room-form.tsx`
- `components/listings/explore.tsx`
- `components/listings/listing-detail.tsx`
- `components/listings/photo-manager.tsx`
- `components/management-tables.tsx`
- `components/public-navbar.tsx`
- `components/shared.tsx`
- `components/ui/alert-dialog.tsx`
- `components/ui/alert.tsx`
- `components/ui/badge.tsx`
- `components/ui/breadcrumb.tsx`
- `components/ui/card.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/field.tsx`
- `components/ui/form.tsx`
- `components/ui/input.tsx`
- `components/ui/label.tsx`
- `components/ui/separator.tsx`
- `components/ui/sheet.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/sonner.tsx`
- `components/ui/table.tsx`
- `components/ui/textarea.tsx`
- `docs/phase-1-files.md`
- `docs/phase-1-report.md`
- `docs/security-review.md`
- `hooks/use-action-result.ts`
- `lib/action-errors.ts`
- `lib/auth.ts`
- `lib/data.ts`
- `lib/format.ts`
- `lib/supabase/client.ts`
- `lib/supabase/config.ts`
- `lib/supabase/server.ts`
- `lib/supabase/session.ts`
- `lib/validation.ts`
- `playwright.config.ts`
- `proxy.ts`
- `scripts/generate-database-types.mjs`
- `scripts/check-repository-secrets.mjs`
- `scripts/seed-admin.mjs`
- `supabase/bootstrap-admin.sql`
- `supabase/config.toml`
- `supabase/seed-admin.sql`
- `supabase/migrations/202609120001_phase_one_schema.sql`
- `supabase/migrations/202609120002_workflows_and_storage.sql`
- `tests/database.test.mjs`
- `tests/listing-workflow.test.mjs`
- `tests/e2e/public.spec.ts`
- `tests/validation.test.ts`
- `types/database.ts`
- `types/domain.ts`
- `types/supabase.ts`

## 2026-09-29 revision

The historical inventory above describes the original Phase 1 implementation. This revision removed `components/listings/photo-manager.tsx` and added:

- `app/api/locations/route.ts`
- `components/boarding-house/location-display.tsx`
- `components/boarding-house/photo-manager.tsx`
- `components/boarding-house/philippine-address-selector.tsx`
- `components/ui/combobox.tsx`
- `lib/locations/philippines.ts`
- `lib/photo-storage.ts`
- `scripts/node-os-userinfo-fallback.mjs`
- `supabase/migrations/202609290001_house_photos_and_psgc_locations.sql`
- `tests/photo-migration.test.mjs`

The revision modified the property/listing actions and forms, owner/admin/public data views, shared management UI, formatting/validation/types, migration and workflow tests, `package.json`, the README, and this report. `package-lock.json` was already modified in the working tree before the revision; its unrelated changes were preserved while adding the local PSGC dependency entry.
