import assert from "node:assert/strict"
import { test } from "node:test"
import { readFile, readdir } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"

// Real PostgreSQL execution in WASM. Only Supabase-owned auth/storage scaffolding
// is stubbed; the unmodified application migrations and all RLS run as written.
test("Phase 1 migrations, ownership, storage policies, and review workflow", async (t) => {
  const db = new PGlite()
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create schema storage;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public, storage to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text unique);
    alter table storage.objects enable row level security;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
  `)
  for (const file of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${file}`, import.meta.url),
        "utf8"
      )
    )
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
  let house, otherHouse, room, listing, photo, secondPhoto
  const details = {
    name: "Blue House",
    city: "Cebu City",
    province: "Cebu",
    status: "active",
    latitude: "",
    longitude: "",
  }
  const amenity = await scalar("select id from public.amenities limit 1")
  await t.test(
    "all eight tables use RLS, and the bucket is private",
    async () => {
      assert.equal(
        await scalar(
          "select count(*)::int from pg_tables where schemaname = 'public' and rowsecurity"
        ),
        8
      )
      assert.equal(
        await scalar(
          "select public from storage.buckets where id = 'listing-photos'"
        ),
        false
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
        assert.equal(
          (
            await db.query(
              "update public.boarding_houses set name='Stolen' where id=$1 returning id",
              [house]
            )
          ).rows.length,
          0
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
      room = await as("owner", () =>
        scalar(
          "insert into public.rooms(boarding_house_id,room_number,room_type,monthly_rent,capacity) values ($1,'101','single',3500,1) returning id",
          [house]
        )
      )
      await as("owner", async () => {
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
        await assert.rejects(
          db.query("update public.rooms set capacity=0 where id=$1", [room]),
          /check constraint/
        )
        await db.query(
          "update public.rooms set description='A bright room' where id=$1",
          [room]
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
            "insert into public.verifications(listing_id,status) values ($1,'approved')",
            [listing]
          ),
          /permission denied/
        )
        await assert.rejects(
          db.query("select public.submit_listing($1)", [listing]),
          /primary listing photo/
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
    `${ids.owner}/${listing}/20000000-0000-4000-8000-000000000001.jpg`
  await t.test(
    "storage ownership, draft privacy, object binding, and primary-photo uniqueness",
    async () => {
      await as("other", () =>
        assert.rejects(
          db.query(
            "insert into storage.objects(bucket_id,name) values ('listing-photos',$1)",
            [objectPath()]
          ),
          /row-level security/
        )
      )
      await as("owner", async () => {
        await assert.rejects(
          db.query("select public.add_listing_photo($1,$2)", [
            listing,
            objectPath(),
          ]),
          /Upload the image/
        )
        await db.query(
          "insert into storage.objects(bucket_id,name) values ('listing-photos',$1)",
          [objectPath()]
        )
        photo = await scalar("select public.add_listing_photo($1,$2)", [
          listing,
          objectPath(),
        ])
        const secondPath = objectPath().replace(
          "000000000001.jpg",
          "000000000002.png"
        )
        await db.query(
          "insert into storage.objects(bucket_id,name) values ('listing-photos',$1)",
          [secondPath]
        )
        secondPhoto = await scalar("select public.add_listing_photo($1,$2)", [
          listing,
          secondPath,
        ])
        await db.query("select public.set_primary_photo($1)", [secondPhoto])
        assert.equal(
          await scalar(
            "select count(*)::int from public.listing_photos where is_primary"
          ),
          1
        )
        await assert.rejects(
          db.query("update public.listing_photos set is_primary=true"),
          /permission denied/
        )
      })
      await as("anon", async () => {
        assert.equal(
          await scalar("select count(*)::int from storage.objects"),
          0
        )
        assert.equal(
          await scalar("select count(*)::int from public.listing_photos"),
          0
        )
      })
    }
  )
  await t.test(
    "submission locks content and creates exactly one pending review",
    async () => {
      await as("owner", async () => {
        await db.query("select public.submit_listing($1)", [listing])
        assert.equal(
          await scalar("select status from public.verifications"),
          "pending"
        )
        await assert.rejects(
          db.query("select public.submit_listing($1)", [listing]),
          /draft or rejected/
        )
        assert.equal(
          (
            await db.query(
              "update public.listings set title='Changed during review' where id=$1 returning id",
              [listing]
            )
          ).rows.length,
          0
        )
        await assert.rejects(
          db.query("select public.set_primary_photo($1)", [photo]),
          /editable/
        )
        assert.equal(
          (
            await db.query(
              "delete from storage.objects where name=$1 returning id",
              [objectPath()]
            )
          ).rows.length,
          0
        )
        await assert.rejects(
          db.query("select public.review_listing($1,'approved',null)", [
            listing,
          ]),
          /administrator/
        )
      })
    }
  )
  await t.test(
    "correction returns a draft with remarks and resubmission retains history",
    async () => {
      await as("admin", async () => {
        await assert.rejects(
          db.query("select public.review_listing($1,'for_correction','')", [
            listing,
          ]),
          /explain/
        )
        await db.query(
          "select public.review_listing($1,'for_correction','Please improve the description.')",
          [listing]
        )
      })
      await as("owner", async () => {
        assert.equal(
          await scalar("select listing_status from public.listings"),
          "draft"
        )
        assert.equal(
          await scalar("select remarks from public.verifications"),
          "Please improve the description."
        )
        await db.query(
          "update public.listings set description='Updated description' where id=$1",
          [listing]
        )
        await db.query("select public.submit_listing($1)", [listing])
        assert.equal(
          await scalar("select count(*)::int from public.verifications"),
          2
        )
      })
    }
  )
  await t.test(
    "approval atomically publishes and makes only reviewed content public",
    async () => {
      await as("admin", () =>
        db.query(
          "select public.review_listing($1,'approved','Details checked.')",
          [listing]
        )
      )
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
        await assert.rejects(
          db.query("select * from public.profiles"),
          /permission denied/
        )
      })
      await as("admin", () =>
        assert.rejects(
          db.query(
            "select public.review_listing($1,'rejected','Second review')",
            [listing]
          ),
          /no longer awaiting/
        )
      )
    }
  )
  await t.test(
    "property, room, and amenity changes invalidate publication and pending reviews",
    async () => {
      await as("owner", async () => {
        await db.query(
          "update public.rooms set monthly_rent=4000 where id=$1",
          [room]
        )
        assert.equal(
          await scalar("select listing_status from public.listings"),
          "draft"
        )
        await db.query("select public.submit_listing($1)", [listing])
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
            "select count(*)::int from public.verifications where status='pending'"
          ),
          0
        )
        await db.query("select public.submit_listing($1)", [listing])
        await db.query(
          "update public.boarding_houses set house_rules='Quiet after 10pm' where id=$1",
          [house]
        )
        assert.equal(
          await scalar("select listing_status from public.listings"),
          "draft"
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
    "rejection is editable and can be resubmitted, removed primary images are replaced",
    async () => {
      await as("owner", () =>
        db.query("select public.submit_listing($1)", [listing])
      )
      await as("admin", () =>
        db.query(
          "select public.review_listing($1,'rejected','Inaccurate listing description.')",
          [listing]
        )
      )
      await as("owner", async () => {
        assert.equal(
          await scalar("select listing_status from public.listings"),
          "rejected"
        )
        const path = await scalar("select public.remove_listing_photo($1)", [
          secondPhoto,
        ])
        await db.query("delete from storage.objects where name=$1", [path])
        assert.equal(
          await scalar("select id from public.listing_photos where is_primary"),
          photo
        )
        await db.query("select public.submit_listing($1)", [listing])
      })
      await as("admin", () =>
        db.query("select public.review_listing($1,'approved',null)", [listing])
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
          "update public.boarding_houses set status='inactive' where id=$1",
          [house]
        )
      )
      await as("anon", () =>
        scalar("select count(*)::int from public.boarding_houses").then((n) =>
          assert.equal(n, 0)
        )
      )
    }
  )
  await db.close()
})
