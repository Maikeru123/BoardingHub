import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"

// Real PostgreSQL execution in WASM. Only Supabase-owned auth/storage scaffolding
// is stubbed; the unmodified application migrations and all RLS run as written.
test("BoardingHub migrations, ownership, storage policies, and workflows", async (t) => {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text unique);
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `)
  const archiveMigration = "202610010002_archives_room_photos_and_billing.sql"
  const migrationOwnerId = "00000000-0000-4000-8000-000000000099"
  const migrationHouseId = "00000000-0000-4000-8000-000000000098"
  for (const file of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (file === archiveMigration) {
      await db.query(
        "insert into auth.users(id, raw_user_meta_data) values ($1, $2)",
        [
          migrationOwnerId,
          {
            first_name: "Migration",
            last_name: "Fixture",
            role: "owner",
          },
        ]
      )
      await db.query(
        "insert into public.boarding_houses(id, owner_id, name, status) values ($1, $2, 'Legacy inactive house', 'inactive')",
        [migrationHouseId, migrationOwnerId]
      )
    }
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8"
      )
    )
    if (file === archiveMigration) {
      const archivedHouse = await db.query(
        "select status from public.boarding_houses where id = $1",
        [migrationHouseId]
      )
      assert.equal(archivedHouse.rows[0]?.status, "archived")
      await db.query("delete from public.boarding_houses where id = $1", [
        migrationHouseId,
      ])
      await db.query("delete from auth.users where id = $1", [migrationOwnerId])
    }
  }
  const ids = {
    owner: "10000000-0000-4000-8000-000000000001",
    other: "10000000-0000-4000-8000-000000000002",
    tenant: "10000000-0000-4000-8000-000000000003",
    admin: "10000000-0000-4000-8000-000000000004",
  }
  for (const [role, id] of Object.entries(ids))
    await db.query(
      "insert into auth.users(id, raw_user_meta_data) values ($1, $2)",
      [
        id,
        {
          first_name: role,
          last_name: "Tester",
          role: role === "other" ? "owner" : role,
          status: "suspended",
        },
      ]
    )
  async function as(role, fn) {
    await db.exec(`set role ${role === "anon" ? "anon" : "authenticated"}`)
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
      ids[role] || "",
    ])
    try {
      return await fn()
    } finally {
      await db.exec("reset role")
    }
  }
  async function scalar(sql, params = []) {
    return Object.values((await db.query(sql, params)).rows[0] || {})[0]
  }
  await t.test(
    "domain class data matches the final table, field, key, type, and nullability metadata",
    async () => {
      const domainData = await readFile(
        new URL("../docs/BoardingHub_Domain_Class_Data.txt", import.meta.url),
        "utf8"
      )
      const documentedTables = new Map(
        [
          ...domainData.matchAll(
            /^([a-z][a-z0-9_]*)\r?\n\r?\nFields:\r?\n([\s\S]*?)\r?\n\r?\nRelationships:/gm
          ),
        ].map((match) => [
          match[1],
          match[2]
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => {
              const field = line.match(
                /^- ([a-z][a-z0-9_]*) : ([A-Z]+(?:\(\d+,\d+\))?)(.*)$/
              )
              assert.ok(field, `Invalid domain field line: ${line}`)
              return {
                name: field[1],
                type: field[2],
                markers: field[3],
              }
            }),
        ])
      )
      const schemaColumns = await db.query(`
        select
          c.table_name,
          c.column_name,
          case
            when c.data_type = 'timestamp with time zone' then 'TIMESTAMPTZ'
            when c.data_type = 'numeric' then
              'NUMERIC(' || c.numeric_precision || ',' || c.numeric_scale || ')'
            else upper(c.data_type)
          end as data_type,
          c.is_nullable = 'YES' as is_nullable,
          exists (
            select 1
            from information_schema.table_constraints tc
            join information_schema.key_column_usage kcu
              on kcu.constraint_schema = tc.constraint_schema
              and kcu.constraint_name = tc.constraint_name
            where tc.constraint_type = 'PRIMARY KEY'
              and tc.table_schema = c.table_schema
              and tc.table_name = c.table_name
              and kcu.column_name = c.column_name
          ) as is_primary_key,
          fk.foreign_key_target
        from information_schema.columns c
        left join lateral (
          select case
            when ccu.table_schema = 'public'
              then ccu.table_name || '.' || ccu.column_name
            else ccu.table_schema || '.' || ccu.table_name || '.' || ccu.column_name
          end as foreign_key_target
          from information_schema.table_constraints tc
          join information_schema.key_column_usage kcu
            on kcu.constraint_schema = tc.constraint_schema
            and kcu.constraint_name = tc.constraint_name
          join information_schema.constraint_column_usage ccu
            on ccu.constraint_schema = tc.constraint_schema
            and ccu.constraint_name = tc.constraint_name
          where tc.constraint_type = 'FOREIGN KEY'
            and tc.table_schema = c.table_schema
            and tc.table_name = c.table_name
            and kcu.column_name = c.column_name
          limit 1
        ) fk on true
        where c.table_schema = 'public'
        order by c.table_name, c.ordinal_position
      `)
      const actualTables = new Map()
      for (const column of schemaColumns.rows) {
        const columns = actualTables.get(column.table_name) || []
        columns.push(column)
        actualTables.set(column.table_name, columns)
      }
      assert.deepEqual(
        [...documentedTables.keys()].sort(),
        [...actualTables.keys()].sort()
      )
      for (const [table, actualColumns] of actualTables) {
        const documentedColumns = documentedTables.get(table)
        assert.deepEqual(
          documentedColumns.map((column) => column.name),
          actualColumns.map((column) => column.column_name),
          `${table} field order does not match the final schema`
        )
        for (let index = 0; index < actualColumns.length; index += 1) {
          const actual = actualColumns[index]
          const documented = documentedColumns[index]
          assert.equal(
            documented.type,
            actual.data_type,
            `${table}.${actual.column_name} type`
          )
          assert.equal(
            documented.markers.includes("[NULLABLE]"),
            actual.is_nullable,
            `${table}.${actual.column_name} nullability`
          )
          assert.equal(
            documented.markers.includes("[PK]"),
            actual.is_primary_key,
            `${table}.${actual.column_name} primary key`
          )
          const documentedForeignKey =
            documented.markers.match(/\[FK -> ([^\]]+)\]/)?.[1] || null
          assert.equal(
            documentedForeignKey,
            actual.foreign_key_target,
            `${table}.${actual.column_name} foreign key`
          )
        }
      }
    }
  )
  let house, otherHouse, room, listing, photo, secondPhoto
  const details = {
    name: "Blue House",
    barangay: "Lahug",
    city_municipality: "City of Cebu",
    province: "Cebu",
    barangay_code: "0730600041",
    city_municipality_code: "0730600000",
    province_code: "0702200000",
    postal_code: "6000",
    status: "active",
    current_month_required: true,
    advance_months_required: 2,
  }
  const amenity = await scalar("select id from public.amenities limit 1")
  await t.test(
    "all seventeen tables use RLS, and storage buckets are private",
    async () => {
      assert.equal(
        await scalar(
          "select count(*)::int from pg_tables where schemaname = 'public' and rowsecurity"
        ),
        17
      )
      assert.equal(
        await scalar(
          "select public from storage.buckets where id = 'boarding-house-photos'"
        ),
        false
      )
      assert.equal(
        await scalar(
          "select public from storage.buckets where id = 'payment-proofs'"
        ),
        false
      )
      assert.equal(
        await scalar(
          "select public from storage.buckets where id = 'room-photos'"
        ),
        false
      )
      assert.equal(
        await scalar(`
          select count(*)::int from information_schema.columns
          where table_schema = 'public'
            and table_name in ('boarding_houses', 'rental_transactions')
            and column_name = 'current_month_required'
            and data_type = 'boolean'
        `),
        2
      )
      assert.equal(
        await scalar(`
          select count(*)::int from information_schema.columns
          where table_schema = 'public'
            and table_name in ('boarding_houses', 'rental_transactions')
            and column_name in (
              'deposit_months_required',
              'security_deposit_months',
              'minimum_stay_months'
            )
        `),
        0
      )
      assert.equal(
        await scalar(`
          select count(*)::int
          from pg_tables
          where schemaname = 'public'
            and tablename in ('listing_verifications', 'listing_reports')
        `),
        2
      )
      assert.equal(
        await scalar(`
          select count(*)::int
          from pg_tables
          where schemaname = 'public'
            and tablename in ('verifications', 'reports')
        `),
        0
      )
      assert.equal(
        await scalar(`
          select count(*)::int
          from information_schema.columns
          where table_schema = 'public'
            and (
              (table_name = 'boarding_houses' and column_name = 'verified_by_admin_id')
              or (table_name = 'rental_transactions' and column_name = 'rental_request_id')
              or (table_name = 'listing_reports' and column_name = 'reporter_id')
              or (table_name = 'feedback' and column_name = 'submitted_by_id')
            )
        `),
        4
      )
      assert.equal(
        await scalar(`
          select count(*)::int
          from information_schema.columns
          where table_schema = 'public'
            and (
              (table_name = 'boarding_houses' and column_name = 'verified_by')
              or (table_name = 'rental_transactions' and column_name = 'request_id')
              or (table_name = 'listing_reports' and column_name = 'user_id')
              or (table_name = 'feedback' and column_name = 'user_id')
            )
        `),
        0
      )
      const staleFunctionIdentifiers = await db.query(`
        select n.nspname as schema_name, p.proname as function_name
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname in ('public', 'private')
          and p.prosrc ~ '(^|[^a-z0-9_])(verifications|reports|request_id|verified_by|user_id)([^a-z0-9_]|$)'
        order by n.nspname, p.proname
      `)
      assert.deepEqual(staleFunctionIdentifiers.rows, [])
      assert.equal(
        await scalar(
          "select private.billing_anniversary('2026-01-31'::date, 1)::text"
        ),
        "2026-02-28"
      )
    }
  )
  await t.test(
    "registration trigger creates matching profiles and blocks metadata privilege escalation",
    async () => {
      assert.equal(await scalar("select count(*)::int from public.profiles"), 4)
      assert.equal(
        await scalar("select role from public.profiles where id=$1", [
          ids.admin,
        ]),
        "tenant"
      )
      assert.equal(
        await scalar("select status from public.profiles where id=$1", [
          ids.owner,
        ]),
        "active"
      )
      await db.query("update public.profiles set role='admin' where id=$1", [
        ids.admin,
      ])
      await as("owner", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.profiles"),
          1
        )
        await assert.rejects(
          db.query("update public.profiles set role='admin' where id=$1", [
            ids.owner,
          ]),
          /permission denied/
        )
        await assert.rejects(
          db.query(
            "update public.profiles set status='suspended' where id=$1",
            [ids.owner]
          ),
          /permission denied/
        )
        await db.query(
          "update public.profiles set first_name='Updated' where id=$1",
          [ids.owner]
        )
      })
    }
  )
  await t.test(
    "transactional property and amenity creation enforces role and rolls back invalid data",
    async () => {
      await as("tenant", () =>
        assert.rejects(
          db.query("select public.save_boarding_house(null,$1,$2)", [
            details,
            [],
          ]),
          /owner account/
        )
      )
      await as("anon", () =>
        assert.rejects(
          db.query("select public.save_boarding_house(null,$1,$2)", [
            details,
            [],
          ]),
          /permission denied/
        )
      )
      await as("owner", async () => {
        await assert.rejects(
          db.query(
            "insert into public.boarding_houses(owner_id,name,verification_status) values ($1,'Bypass approval','approved')",
            [ids.owner]
          ),
          /permission denied/
        )
        await assert.rejects(
          db.query("select public.save_boarding_house(null,$1,$2)", [
            { ...details, advance_months_required: 7 },
            [],
          ]),
          /between zero and six/
        )
        await assert.rejects(
          db.query("select public.save_boarding_house(null,$1,$2)", [
            details,
            ["00000000-0000-4000-8000-000000000001"],
          ]),
          /foreign key/
        )
        assert.equal(
          await scalar("select count(*)::int from public.boarding_houses"),
          0
        )
        await assert.rejects(
          db.query("select public.save_boarding_house(null,$1,$2)", [
            { ...details, barangay_code: "0730700041" },
            [],
          ]),
          /boarding_houses_psgc_barangay_parent/
        )
        house = await scalar("select public.save_boarding_house(null,$1,$2)", [
          details,
          [amenity],
        ])
        assert.equal(
          await scalar(
            "select count(*)::int from public.boarding_house_amenities"
          ),
          1
        )
      })
      otherHouse = await as("other", () =>
        scalar("select public.save_boarding_house(null,$1,$2)", [
          { ...details, name: "Other House" },
          [],
        ])
      )
    }
  )
  await t.test(
    "owners cannot read or change another owner’s private property or rooms",
    async () => {
      await as("other", async () => {
        assert.equal(
          await scalar(
            "select count(*)::int from public.boarding_houses where id=$1",
            [house]
          ),
          0
        )
        await assert.rejects(
          db.query(
            "update public.boarding_houses set name='Stolen' where id=$1 returning id",
            [house]
          ),
          /permission denied/
        )
        await assert.rejects(
          db.query("select public.save_boarding_house($1,$2,$3)", [
            house,
            details,
            [],
          ]),
          /cannot be edited/
        )
        await assert.rejects(
          db.query(
            "insert into public.rooms(boarding_house_id,room_type,monthly_rent,capacity) values ($1,'single',3000,1)",
            [house]
          ),
          /row-level security/
        )
      })
      await as("owner", async () => {
        await assert.rejects(
          db.query(
            "insert into public.rooms(boarding_house_id,room_number,room_type,monthly_rent,capacity) values ($1,'101','single',3500,1)",
            [house]
          ),
          /row-level security/
        )
      })
    }
  )
  await t.test(
    "owners cannot self-publish, reparent listings, or write verification records",
    async () => {
      listing = await as("owner", () =>
        scalar(
          "insert into public.listings(boarding_house_id,title) values ($1,'Blue House Rooms') returning id",
          [house]
        )
      )
      await as("owner", async () => {
        await assert.rejects(
          db.query(
            "update public.listings set listing_status='published' where id=$1",
            [listing]
          )
        )
        await assert.rejects(
          db.query(
            "update public.listings set boarding_house_id=$1 where id=$2",
            [otherHouse, listing]
          )
        )
        await assert.rejects(
          db.query(
            "insert into public.listings(boarding_house_id,title,listing_status) values ($1,'Bypass','published')",
            [house]
          ),
          /row-level security/
        )
        await assert.rejects(
          db.query(
            "insert into public.listing_verifications(listing_id,status) values ($1,'approved')",
            [listing]
          ),
          /permission denied/
        )
        await assert.rejects(
          db.query("select public.submit_listing($1)", [listing]),
          /must be approved/
        )
      })
      await as("tenant", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.listings"),
          0
        )
        assert.equal(await scalar("select count(*)::int from public.rooms"), 0)
        assert.equal(
          await scalar("select count(*)::int from public.boarding_houses"),
          0
        )
      })
    }
  )
  const objectPath = () =>
    `boarding-houses/${ids.owner}/${house}/20000000-0000-4000-8000-000000000001.jpg`
  await t.test(
    "storage ownership, draft privacy, object binding, and primary-photo uniqueness",
    async () => {
      await as("other", () =>
        assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values ('boarding-house-photos',$1)",
            [objectPath()]
          ),
          /row-level security/
        )
      )
      await as("owner", async () => {
        await assert.rejects(
          db.query("select public.add_boarding_house_photo($1,$2)", [
            house,
            objectPath(),
          ]),
          /Upload the image/
        )
        await db.query(
          "insert into storage.objects(bucket_id,name) values ('boarding-house-photos',$1)",
          [objectPath()]
        )
        photo = await scalar("select public.add_boarding_house_photo($1,$2)", [
          house,
          objectPath(),
        ])
        const secondPath = objectPath().replace(
          "000000000001.jpg",
          "000000000002.png"
        )
        await db.query(
          "insert into storage.objects(bucket_id,name) values ('boarding-house-photos',$1)",
          [secondPath]
        )
        secondPhoto = await scalar(
          "select public.add_boarding_house_photo($1,$2)",
          [house, secondPath]
        )
        await db.query("select public.set_primary_boarding_house_photo($1)", [
          secondPhoto,
        ])
        assert.equal(
          await scalar(
            "select count(*)::int from public.boarding_house_photos where is_primary"
          ),
          1
        )
        await assert.rejects(
          db.query("update public.boarding_house_photos set is_primary=true"),
          /permission denied/
        )
      })
      await as("anon", async () => {
        assert.equal(
          await scalar("select count(*)::int from storage.objects"),
          0
        )
        assert.equal(
          await scalar(
            "select count(*)::int from public.boarding_house_photos"
          ),
          0
        )
      })
    }
  )
  await t.test(
    "boarding house submission is owner-only and enters the review queue",
    async () => {
      await as("owner", async () => {
        await db.query("select public.submit_boarding_house($1)", [house])
        assert.equal(
          await scalar(
            "select verification_status from public.boarding_houses where id=$1",
            [house]
          ),
          "pending"
        )
        await assert.rejects(
          db.query("select public.submit_boarding_house($1)", [house]),
          /not ready/
        )
        await assert.rejects(
          db.query("select public.review_boarding_house($1,'approved',null)", [
            house,
          ]),
          /Administrator/
        )
        await assert.rejects(
          db.query(
            "update public.boarding_houses set verification_status='approved' where id=$1",
            [house]
          ),
          /permission denied/
        )
      })
    }
  )
  await t.test(
    "correction returns remarks and the owner can resubmit",
    async () => {
      await as("admin", async () => {
        await assert.rejects(
          db.query(
            "select public.review_boarding_house($1,'for_correction','')",
            [house]
          ),
          /explain/
        )
        await db.query(
          "select public.review_boarding_house($1,'for_correction','Please improve the description.')",
          [house]
        )
      })
      await as("owner", async () => {
        assert.equal(
          await scalar(
            "select verification_status from public.boarding_houses where id=$1",
            [house]
          ),
          "for_correction"
        )
        assert.equal(
          await scalar(
            "select verification_remarks from public.boarding_houses where id=$1",
            [house]
          ),
          "Please improve the description."
        )
        await db.query("select public.save_boarding_house($1,$2,$3)", [
          house,
          { ...details, description: "Updated description" },
          [amenity],
        ])
        await db.query("select public.submit_boarding_house($1)", [house])
      })
    }
  )
  await t.test(
    "approval enables normalized rooms and direct listing publication",
    async () => {
      await as("admin", () =>
        db.query(
          "select public.review_boarding_house($1,'approved','Details checked.')",
          [house]
        )
      )
      await as("owner", async () => {
        room = await scalar(
          "insert into public.rooms(boarding_house_id,room_number,room_type,monthly_rent,capacity) values ($1,'101','single',3500,77) returning id",
          [house]
        )
        assert.equal(
          await scalar("select capacity from public.rooms where id=$1", [room]),
          1
        )
        await assert.rejects(
          db.query("update public.rooms set boarding_house_id=$1 where id=$2", [
            otherHouse,
            room,
          ])
        )
        await assert.rejects(
          db.query("update public.rooms set monthly_rent=-1 where id=$1", [
            room,
          ]),
          /check constraint/
        )
        await db.query("select public.submit_listing($1)", [listing])
      })
      await as("anon", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.listings"),
          1
        )
        assert.equal(
          await scalar("select count(*)::int from public.boarding_houses"),
          1
        )
        assert.equal(await scalar("select count(*)::int from public.rooms"), 1)
        assert.equal(
          await scalar("select count(*)::int from storage.objects"),
          2
        )
        assert.equal(
          await scalar(
            "select count(*)::int from public.boarding_house_amenities"
          ),
          1
        )
        assert.equal(
          await scalar(
            "select count(*)::int from public.discover_boarding_houses(search_text => 'Lahug', maximum_rent => 5000)"
          ),
          1
        )
        assert.equal(
          await scalar(
            "select count(*)::int from public.discover_boarding_houses(search_text => 'nowhere')"
          ),
          0
        )
        await assert.rejects(
          db.query("select * from public.profiles"),
          /permission denied/
        )
      })
      await as("admin", () =>
        assert.rejects(
          db.query(
            "select public.review_boarding_house($1,'rejected','Second review')",
            [house]
          ),
          /no longer awaiting review/
        )
      )
    }
  )
  await t.test(
    "room photos are room-owned, private in storage, and publicly readable only with a published property",
    async () => {
      const path = `rooms/${ids.owner}/${room}/room.png`
      const photoId = await as("owner", async () => {
        await db.query(
          "insert into storage.objects(bucket_id,name) values ('room-photos',$1)",
          [path]
        )
        return scalar("select public.add_room_photo($1,$2)", [room, path])
      })
      await as("other", () =>
        assert.rejects(
          db.query("select public.set_primary_room_photo($1)", [photoId]),
          /your rooms/
        )
      )
      await as("anon", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.room_photos"),
          1
        )
        assert.equal(
          await scalar(
            "select count(*)::int from storage.objects where bucket_id='room-photos'"
          ),
          1
        )
      })
    }
  )
  let inquiry
  await t.test(
    "inquiries are private, normalized, reusable, readable, and owner-controlled",
    async () => {
      inquiry = await as("tenant", async () => {
        const thread = await scalar(
          "select public.start_inquiry($1, 'Is room 101 available next month?')",
          [listing]
        )
        const reused = await scalar(
          "select public.start_inquiry($1, 'I am following up on my question.')",
          [listing]
        )
        assert.equal(reused, thread)
        assert.equal(
          await scalar("select count(*)::int from public.inquiry_threads"),
          1
        )
        assert.equal(
          await scalar("select count(*)::int from public.inquiry_messages"),
          2
        )
        assert.equal(
          await scalar(
            "select count(*)::int from public.profiles where id=$1",
            [ids.owner]
          ),
          1
        )
        return thread
      })
      await as("other", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.inquiry_threads"),
          0
        )
        assert.equal(
          await scalar("select count(*)::int from public.inquiry_messages"),
          0
        )
        await assert.rejects(
          db.query("select public.send_inquiry_message($1, 'Unauthorized')", [
            inquiry,
          ]),
          /cannot access/
        )
      })
      await as("admin", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.inquiry_threads"),
          0
        )
        assert.equal(
          await scalar("select count(*)::int from public.inquiry_messages"),
          0
        )
      })
      await as("owner", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.inquiry_threads"),
          1
        )
        assert.equal(
          await scalar(
            "select count(*)::int from public.profiles where id=$1",
            [ids.tenant]
          ),
          1
        )
        await db.query(
          "select public.send_inquiry_message($1, 'Yes, it is generally available.')",
          [inquiry]
        )
        await db.query("select public.mark_inquiry_read($1)", [inquiry])
        assert.equal(
          await scalar(
            "select count(*)::int from public.inquiry_messages where sender_id=$1 and read_at is null",
            [ids.tenant]
          ),
          0
        )
        await db.query("select public.set_inquiry_status($1, 'closed')", [
          inquiry,
        ])
      })
      await as("tenant", async () => {
        await assert.rejects(
          db.query(
            "select public.send_inquiry_message($1, 'One more question')",
            [inquiry]
          ),
          /closed/
        )
        await db.query("select public.mark_inquiry_read($1)", [inquiry])
        assert.equal(
          await scalar(
            "select count(*)::int from public.inquiry_messages where sender_id=$1 and read_at is null",
            [ids.owner]
          ),
          0
        )
      })
      await as("owner", () =>
        db.query("select public.set_inquiry_status($1, 'open')", [inquiry])
      )
    }
  )
  await t.test(
    "rental approval prevents overlap and supports payment, ending, review, and fixed terms",
    async () => {
      const request = await as("tenant", () =>
        scalar(
          "select public.submit_rental_request($1,current_date,'open_ended',null)",
          [room]
        )
      )
      await as("tenant", () =>
        assert.rejects(
          db.query("select public.decide_rental_request($1,'approved')", [
            request,
          ]),
          /not found/
        )
      )
      const rental = await as("owner", () =>
        scalar("select public.decide_rental_request($1,'approved')", [request])
      )
      assert.equal(
        await scalar(
          "select initial_payment_amount::int from public.rental_transactions where id=$1",
          [rental]
        ),
        10500
      )
      await as("tenant", () =>
        assert.rejects(
          db.query(
            "select public.submit_rental_request($1,current_date + 10,'open_ended',null)",
            [room]
          ),
          /not available/
        )
      )
      const initialPayment = await as("tenant", async () => {
        await assert.rejects(
          db.query(
            "select public.submit_payment($1,'initial',10500,'gcash','REF-1',null,null,null)",
            [rental]
          ),
          /proof image/
        )
        const proofPath = `${ids.tenant}/${rental}/initial/proof.png`
        await db.query(
          "insert into storage.objects(bucket_id,name) values ('payment-proofs',$1)",
          [proofPath]
        )
        return scalar(
          "select public.submit_payment($1,'initial',10500,'gcash','REF-1',$2,null,null)",
          [rental, proofPath]
        )
      })
      await as("tenant", async () => {
        const deletion = await db.query(
          "delete from storage.objects where bucket_id='payment-proofs' returning id"
        )
        assert.equal(deletion.rows.length, 0)
      })
      await as("tenant", () =>
        assert.rejects(
          db.query("select public.review_payment($1,'paid',null)", [
            initialPayment,
          ]),
          /not found/
        )
      )
      await as("owner", () =>
        db.query("select public.review_payment($1,'paid','Verified')", [
          initialPayment,
        ])
      )
      assert.equal(
        await scalar(
          "select status from public.rental_transactions where id=$1",
          [rental]
        ),
        "active"
      )
      await as("anon", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.rooms where id=$1", [
            room,
          ]),
          0
        )
        assert.equal(
          await scalar(
            "select availability_state from public.get_public_room_states($1) where room_id=$2",
            [house, room]
          ),
          "occupied"
        )
      })
      const monthlyPayment = await as("tenant", async () => {
        const payment = await scalar(
          "select public.submit_payment($1,'monthly',3500,'cash',null,null,(current_date + interval '3 months')::date,(current_date + interval '4 months' - interval '1 day')::date)",
          [rental]
        )
        await assert.rejects(
          db.query(
            "select public.submit_payment($1,'monthly',3500,'cash',null,null,(current_date + interval '3 months')::date,(current_date + interval '4 months' - interval '1 day')::date)",
            [rental]
          ),
          /already exists/
        )
        return payment
      })
      await as("owner", () =>
        db.query("select public.review_payment($1,'paid','Cash received')", [
          monthlyPayment,
        ])
      )
      await as("owner", async () => {
        await db.query(
          "select public.set_rental_end($1,current_date + 30,null)",
          [rental]
        )
        assert.equal(
          await scalar(
            "select status from public.rental_transactions where id=$1",
            [rental]
          ),
          "ending"
        )
        await db.query(
          "select public.set_rental_end($1,current_date + 30,current_date)",
          [rental]
        )
      })
      await as("tenant", () =>
        db.query(
          "select public.submit_review($1,5,'A safe and comfortable stay.')",
          [rental]
        )
      )
      await as("admin", () =>
        assert.rejects(
          db.query("select public.submit_review($1,5,'Fake review')", [rental]),
          /completed rental/
        )
      )
      assert.equal(
        await as("anon", () =>
          scalar(
            "select public.check_room_availability($1,current_date + 60,null)",
            [room]
          )
        ),
        true
      )
      const fixedRequest = await as("tenant", () =>
        scalar(
          "select public.submit_rental_request($1,current_date + 60,'fixed_term',current_date + 120)",
          [room]
        )
      )
      await as("owner", () =>
        db.query("select public.decide_rental_request($1,'approved')", [
          fixedRequest,
        ])
      )
      assert.equal(
        await scalar(
          "select count(*)::int from public.rental_transactions where rental_type='fixed_term'"
        ),
        1
      )
      assert.equal(
        await as("anon", () =>
          scalar(
            "select availability_state from public.get_public_room_states($1) where room_id=$2",
            [house, room]
          )
        ),
        "future_reserved"
      )

      const rejectedRequest = await as("tenant", () =>
        scalar(
          "select public.submit_rental_request($1,current_date + 121,'fixed_term',current_date + 150)",
          [room]
        )
      )
      await as("owner", async () => {
        await assert.rejects(
          db.query("select public.decide_rental_request($1,'rejected')", [
            rejectedRequest,
          ]),
          /Explain why/
        )
        await db.query(
          "select public.decide_rental_request($1,'rejected',$2)",
          [rejectedRequest, "The requested dates are not available."]
        )
      })
      assert.equal(
        await as("tenant", () =>
          scalar(
            "select rejection_reason from public.rental_requests where id=$1",
            [rejectedRequest]
          )
        ),
        "The requested dates are not available."
      )

      const cancellableRequest = await as("tenant", () =>
        scalar(
          "select public.submit_rental_request($1,current_date + 121,'fixed_term',current_date + 150)",
          [room]
        )
      )
      const cancellableRental = await as("owner", () =>
        scalar("select public.decide_rental_request($1,'approved')", [
          cancellableRequest,
        ])
      )
      await as("tenant", () =>
        db.query("select public.cancel_rental_transaction($1)", [
          cancellableRental,
        ])
      )
      assert.deepEqual(
        (
          await db.query(
            `select t.status as rental_status, r.status as request_status
             from public.rental_transactions t
             join public.rental_requests r on r.id = t.rental_request_id
             where t.id = $1`,
            [cancellableRental]
          )
        ).rows[0],
        { rental_status: "cancelled", request_status: "cancelled" }
      )
    }
  )
  await t.test(
    "room changes stay moderated separately while property facts invalidate approval",
    async () => {
      await as("owner", async () => {
        await db.query(
          "update public.rooms set monthly_rent=4000 where id=$1",
          [room]
        )
        assert.equal(
          await scalar("select listing_status from public.listings"),
          "published"
        )
        await db.query(
          "delete from public.boarding_house_amenities where boarding_house_id=$1",
          [house]
        )
        assert.equal(
          await scalar("select listing_status from public.listings"),
          "draft"
        )
        assert.equal(
          await scalar(
            "select verification_status from public.boarding_houses where id=$1",
            [house]
          ),
          "for_correction"
        )
      })
      await as("anon", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.listings"),
          0
        )
        assert.equal(
          await scalar("select count(*)::int from storage.objects"),
          0
        )
      })
    }
  )
  await t.test(
    "boarding house rejection can be corrected and primary images are preserved",
    async () => {
      await as("owner", () =>
        db.query("select public.submit_boarding_house($1)", [house])
      )
      await as("admin", () =>
        db.query(
          "select public.review_boarding_house($1,'rejected','Inaccurate property description.')",
          [house]
        )
      )
      await as("owner", async () => {
        assert.equal(
          await scalar(
            "select verification_status from public.boarding_houses where id=$1",
            [house]
          ),
          "rejected"
        )
        const path = await scalar(
          "select public.remove_boarding_house_photo($1)",
          [secondPhoto]
        )
        await db.query("delete from storage.objects where name=$1", [path])
        assert.equal(
          await scalar(
            "select id from public.boarding_house_photos where is_primary"
          ),
          photo
        )
        await db.query("select public.submit_boarding_house($1)", [house])
      })
      await as("admin", () =>
        db.query("select public.review_boarding_house($1,'approved',null)", [
          house,
        ])
      )
      await as("owner", () =>
        db.query("select public.submit_listing($1)", [listing])
      )
    }
  )
  await t.test(
    "account suspension blocks mutations and hides public properties, self-suspension is denied",
    async () => {
      await as("tenant", () =>
        assert.rejects(
          db.query("select public.set_account_status($1,'suspended')", [
            ids.owner,
          ]),
          /administrator/
        )
      )
      await as("admin", async () => {
        await assert.rejects(
          db.query("select public.set_account_status($1,'suspended')", [
            ids.admin,
          ]),
          /own account/
        )
        await db.query("select public.set_account_status($1,'suspended')", [
          ids.owner,
        ])
      })
      await as("owner", async () => {
        assert.equal(
          await scalar("select count(*)::int from public.boarding_houses"),
          0
        )
        assert.equal(
          (
            await db.query(
              "update public.profiles set first_name='Bypass' returning id"
            )
          ).rows.length,
          0
        )
        await assert.rejects(
          db.query("select public.save_boarding_house(null,$1,$2)", [
            details,
            [],
          ]),
          /active owner/
        )
      })
      await as("anon", () =>
        scalar("select count(*)::int from public.listings").then((n) =>
          assert.equal(n, 0)
        )
      )
      await as("admin", () =>
        db.query("select public.set_account_status($1,'active')", [ids.owner])
      )
      await as("owner", () =>
        db.query(
          "update public.boarding_houses set status='archived' where id=$1",
          [house]
        )
      )
      await as("anon", () =>
        Promise.all([
          scalar("select count(*)::int from public.boarding_houses").then((n) =>
            assert.equal(n, 0)
          ),
          scalar(
            "select count(*)::int from public.discover_boarding_houses(search_text => 'Blue House')"
          ).then((n) => assert.equal(n, 0)),
        ])
      )
    }
  )
  await t.test(
    "admin seed requires the exact confirmed account and preserves existing state",
    async () => {
      const seed = await readFile(
        new URL("../supabase/seed-admin.sql", import.meta.url),
        "utf8"
      )
      await db.query(
        "select set_config('boardinghub.seed_admin_email', $1, false)",
        ["admin@example.com"]
      )
      await assert.rejects(db.exec(seed), /Create and confirm/)
      await db.query(
        "update auth.users set email=$1, email_confirmed_at=now() where id=$2",
        ["another@example.com", ids.tenant]
      )
      await assert.rejects(db.exec(seed), /Create and confirm/)
      assert.equal(
        await scalar("select role from public.profiles where id=$1", [
          ids.tenant,
        ]),
        "tenant"
      )
      await db.query(
        "update auth.users set email=$1, email_confirmed_at=null where id=$2",
        ["admin@example.com", ids.tenant]
      )
      await assert.rejects(db.exec(seed), /Create and confirm/)
      await db.query(
        "update auth.users set email_confirmed_at=now() where id=$1",
        [ids.tenant]
      )
      await as("tenant", () =>
        assert.rejects(db.exec(seed), /permission denied/)
      )
      await db.exec(seed)
      assert.equal(
        await scalar("select role from public.profiles where id=$1", [
          ids.tenant,
        ]),
        "admin"
      )
      const timestamp = await scalar(
        "select updated_at::text from public.profiles where id=$1",
        [ids.tenant]
      )
      await db.exec(seed)
      assert.equal(
        await scalar(
          "select updated_at::text from public.profiles where id=$1",
          [ids.tenant]
        ),
        timestamp
      )
      await db.query(
        "update public.profiles set status='suspended' where id=$1",
        [ids.tenant]
      )
      await assert.rejects(db.exec(seed), /suspension is not overridden/)
      assert.equal(
        await scalar("select status from public.profiles where id=$1", [
          ids.tenant,
        ]),
        "suspended"
      )
    }
  )
  await db.close()
})
