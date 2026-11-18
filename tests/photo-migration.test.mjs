import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { PGlite } from "@electric-sql/pglite"

const migrationUrl = (name) =>
  new URL(`../supabase/migrations/${name}`, import.meta.url)

test("legacy listing photos migrate to their boarding house without data loss", async (t) => {
  const db = new PGlite()
  t.after(() => db.close())

  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create schema storage;
    create table auth.users (
      id uuid primary key,
      email text,
      email_confirmed_at timestamptz,
      raw_user_meta_data jsonb default '{}'
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets (
      id text primary key,
      name text,
      public boolean,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text references storage.buckets(id),
      name text unique
    );
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `)

  for (const name of [
    "202609120001_phase_one_schema.sql",
    "202609120002_workflows_and_storage.sql",
  ]) {
    await db.exec(await readFile(migrationUrl(name), "utf8"))
  }

  const ownerId = "20000000-0000-4000-8000-000000000001"
  const houseId = "20000000-0000-4000-8000-000000000002"
  const listingOne = "20000000-0000-4000-8000-000000000003"
  const listingTwo = "20000000-0000-4000-8000-000000000004"
  const photoIds = [
    "20000000-0000-4000-8000-000000000005",
    "20000000-0000-4000-8000-000000000006",
    "20000000-0000-4000-8000-000000000007",
  ]
  const paths = [
    `${ownerId}/${listingOne}/front.jpg`,
    `${ownerId}/${listingOne}/room.jpg`,
    `${ownerId}/${listingTwo}/garden.jpg`,
  ]

  await db.query(
    "insert into auth.users(id, raw_user_meta_data) values ($1, $2)",
    [
      ownerId,
      {
        first_name: "Migration",
        last_name: "Owner",
        role: "owner",
      },
    ]
  )
  await db.query(
    `insert into public.boarding_houses (id, owner_id, name, city, province)
     values ($1, $2, 'Legacy House', 'Cebu City', 'Cebu')`,
    [houseId, ownerId]
  )
  await db.query(
    `insert into public.listings (id, boarding_house_id, title)
     values ($1, $3, 'First listing'), ($2, $3, 'Second listing')`,
    [listingOne, listingTwo, houseId]
  )
  await db.query(
    `insert into public.listing_photos
       (id, listing_id, image_path, is_primary, created_at)
     values
       ($1, $4, $6, true, '2026-01-02T00:00:00Z'),
       ($2, $4, $7, false, '2026-01-03T00:00:00Z'),
       ($3, $5, $8, true, '2026-01-01T00:00:00Z')`,
    [...photoIds, listingOne, listingTwo, ...paths]
  )
  for (const path of paths) {
    await db.query(
      "insert into storage.objects(bucket_id, name) values ('listing-photos', $1)",
      [path]
    )
  }

  await db.exec(
    await readFile(
      migrationUrl("202609290001_house_photos_and_psgc_locations.sql"),
      "utf8"
    )
  )

  const migrated = (
    await db.query(
      `select id, boarding_house_id, image_path, is_primary
       from public.boarding_house_photos
       order by image_path`
    )
  ).rows
  assert.equal(migrated.length, 3)
  assert.deepEqual(migrated.map(({ id }) => id).sort(), [...photoIds].sort())
  assert.deepEqual(
    migrated.map(({ image_path }) => image_path).sort(),
    [...paths].sort()
  )
  assert.ok(
    migrated.every(({ boarding_house_id }) => boarding_house_id === houseId)
  )

  const primary = migrated.filter(({ is_primary }) => is_primary)
  assert.equal(primary.length, 1)
  assert.equal(primary[0].image_path, paths[2])

  const oldTable = await db.query(
    "select to_regclass('public.listing_photos') as table_name"
  )
  assert.equal(oldTable.rows[0].table_name, null)

  const buckets = (
    await db.query("select id, public from storage.buckets order by id")
  ).rows
  assert.deepEqual(buckets, [
    { id: "boarding-house-photos", public: false },
    { id: "listing-photos", public: false },
  ])
  assert.equal(
    (
      await db.query(
        "select count(*)::int as count from storage.objects where bucket_id = 'listing-photos'"
      )
    ).rows[0].count,
    3
  )
})
