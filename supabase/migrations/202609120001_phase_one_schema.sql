-- All application access uses the caller's JWT; no service key is needed by Next.js.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null check (length(trim(first_name)) between 1 and 80),
  last_name text not null check (length(trim(last_name)) between 1 and 80),
  contact_number text check (contact_number is null or contact_number ~ '^\+?[0-9 ()-]{7,25}$'),
  role text not null check (role in ('tenant', 'owner', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.boarding_houses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (length(trim(name)) between 1 and 160),
  description text check (length(description) <= 5000),
  street text, barangay text, city text, province text,
  latitude numeric(10,7) check (latitude between -90 and 90),
  longitude numeric(10,7) check (longitude between -180 and 180),
  contact_number text check (contact_number is null or contact_number ~ '^\+?[0-9 ()-]{7,25}$'),
  house_rules text check (length(house_rules) <= 5000),
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  boarding_house_id uuid not null references public.boarding_houses(id) on delete cascade,
  room_number text check (length(room_number) <= 50),
  room_type text not null check (room_type in ('single', 'shared', 'bed_space', 'studio')),
  monthly_rent numeric(12,2) not null check (monthly_rent > 0),
  capacity integer not null check (capacity between 1 and 100),
  status text not null default 'available' check (status in ('available', 'maintenance', 'inactive')),
  description text check (length(description) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (boarding_house_id, room_number)
);
comment on column public.rooms.status is 'General usability only. Date-based rental availability is deferred to Phase 3.';

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text
);
create table public.boarding_house_amenities (
  boarding_house_id uuid not null references public.boarding_houses(id) on delete cascade,
  amenity_id uuid not null references public.amenities(id) on delete restrict,
  primary key (boarding_house_id, amenity_id)
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  boarding_house_id uuid not null references public.boarding_houses(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  description text check (length(description) <= 5000),
  listing_status text not null default 'draft' check (listing_status in ('draft', 'for_review', 'approved', 'rejected', 'published', 'suspended')),
  date_posted timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.listing_photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  image_path text unique not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index listing_one_primary_photo on public.listing_photos(listing_id) where is_primary;

create table public.verifications (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  admin_id uuid references public.profiles(id) on delete set null,
  date_submitted timestamptz not null default now(),
  date_reviewed timestamptz,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'for_correction')),
  remarks text check (length(remarks) <= 3000),
  check ((status = 'pending' and date_reviewed is null) or (status <> 'pending' and date_reviewed is not null))
);
create unique index verification_one_pending on public.verifications(listing_id) where status = 'pending';

create index profiles_role_status on public.profiles(role, status);
create index boarding_houses_owner on public.boarding_houses(owner_id);
create index boarding_houses_location on public.boarding_houses(city, province) where status = 'active';
create index rooms_house_status on public.rooms(boarding_house_id, status);
create index amenities_reverse on public.boarding_house_amenities(amenity_id);
create index listings_house on public.listings(boarding_house_id);
create index listings_status_date on public.listings(listing_status, created_at desc);
create index photos_listing on public.listing_photos(listing_id);
create index verifications_listing_date on public.verifications(listing_id, date_submitted desc);
create index verifications_admin on public.verifications(admin_id);
create index verifications_pending on public.verifications(date_submitted) where status = 'pending';

create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger profiles_updated before update on public.profiles for each row execute function private.touch_updated_at();
create trigger houses_updated before update on public.boarding_houses for each row execute function private.touch_updated_at();
create trigger rooms_updated before update on public.rooms for each row execute function private.touch_updated_at();
create trigger listings_updated before update on public.listings for each row execute function private.touch_updated_at();

-- Metadata is untrusted. Only two public roles are accepted; admin/status metadata is ignored.
create function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, first_name, last_name, contact_number, role)
  values (
    new.id,
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'first_name'), 80), ''), 'New'),
    coalesce(nullif(left(trim(new.raw_user_meta_data ->> 'last_name'), 80), ''), 'Member'),
    case when new.raw_user_meta_data ->> 'contact_number' ~ '^\+?[0-9 ()-]{7,25}$' then new.raw_user_meta_data ->> 'contact_number' else null end,
    case when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner' else 'tenant' end
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
-- Backfill existing Auth accounts without overwriting any profile.
insert into public.profiles (id, first_name, last_name, role)
select id, coalesce(nullif(left(trim(raw_user_meta_data ->> 'first_name'), 80), ''), 'New'),
  coalesce(nullif(left(trim(raw_user_meta_data ->> 'last_name'), 80), ''), 'Member'),
  case when raw_user_meta_data ->> 'role' = 'owner' then 'owner' else 'tenant' end
from auth.users on conflict (id) do nothing;

create function private.current_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and status = 'active';
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_role() = 'admin', false);
$$;
create function private.owns_house(house_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() = 'owner' and exists (select 1 from public.boarding_houses where id = house_id and owner_id = (select auth.uid()));
$$;
create function private.public_house(house_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.boarding_houses h join public.profiles p on p.id = h.owner_id
    where h.id = house_id and h.status = 'active' and p.status = 'active'
    and exists (select 1 from public.listings l where l.boarding_house_id = h.id and l.listing_status = 'published'));
$$;
create function private.owns_listing(listing uuid, editable boolean default false) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings l where l.id = listing and private.owns_house(l.boarding_house_id)
    and (not editable or l.listing_status in ('draft', 'rejected')));
$$;
create function private.public_listing(listing uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.listings where id = listing and listing_status = 'published' and private.public_house(boarding_house_id));
$$;

alter table public.profiles enable row level security;
alter table public.boarding_houses enable row level security;
alter table public.rooms enable row level security;
alter table public.amenities enable row level security;
alter table public.boarding_house_amenities enable row level security;
alter table public.listings enable row level security;
alter table public.listing_photos enable row level security;
alter table public.verifications enable row level security;

revoke all on public.profiles, public.boarding_houses, public.rooms, public.amenities, public.boarding_house_amenities, public.listings, public.listing_photos, public.verifications from anon, authenticated;
grant select on public.boarding_houses, public.rooms, public.amenities, public.boarding_house_amenities, public.listings, public.listing_photos to anon, authenticated;
grant select on public.profiles, public.verifications to authenticated;
grant update (first_name, last_name, contact_number) on public.profiles to authenticated;
grant insert, update, delete on public.boarding_houses, public.rooms, public.boarding_house_amenities, public.listings to authenticated;
-- Photo metadata, verification and account status writes are available only through validated RPCs.

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_admin());
create policy profiles_update_self on public.profiles for update to authenticated using (id = (select auth.uid()) and status = 'active') with check (id = (select auth.uid()) and status = 'active');
create policy houses_read on public.boarding_houses for select to anon, authenticated using (private.public_house(id) or private.owns_house(id) or private.is_admin());
create policy houses_insert on public.boarding_houses for insert to authenticated with check (private.current_role() = 'owner' and owner_id = (select auth.uid()) and status in ('active', 'inactive'));
create policy houses_update on public.boarding_houses for update to authenticated using (private.owns_house(id) and status <> 'suspended') with check (private.owns_house(id) and owner_id = (select auth.uid()) and status in ('active', 'inactive'));
create policy houses_delete on public.boarding_houses for delete to authenticated using (private.owns_house(id) and status <> 'suspended');
create policy rooms_read on public.rooms for select to anon, authenticated using ((status = 'available' and private.public_house(boarding_house_id)) or private.owns_house(boarding_house_id) or private.is_admin());
create policy rooms_insert on public.rooms for insert to authenticated with check (private.owns_house(boarding_house_id));
create policy rooms_update on public.rooms for update to authenticated using (private.owns_house(boarding_house_id)) with check (private.owns_house(boarding_house_id));
create policy rooms_delete on public.rooms for delete to authenticated using (private.owns_house(boarding_house_id));
create policy amenities_read on public.amenities for select to anon, authenticated using (true);
create policy house_amenities_read on public.boarding_house_amenities for select to anon, authenticated using (private.public_house(boarding_house_id) or private.owns_house(boarding_house_id) or private.is_admin());
create policy house_amenities_insert on public.boarding_house_amenities for insert to authenticated with check (private.owns_house(boarding_house_id));
create policy house_amenities_delete on public.boarding_house_amenities for delete to authenticated using (private.owns_house(boarding_house_id));
create policy listings_read on public.listings for select to anon, authenticated using (private.public_listing(id) or private.owns_house(boarding_house_id) or private.is_admin());
create policy listings_insert on public.listings for insert to authenticated with check (private.owns_house(boarding_house_id) and listing_status = 'draft' and date_posted is null);
create policy listings_update on public.listings for update to authenticated using (private.owns_listing(id, true)) with check (private.owns_house(boarding_house_id) and listing_status in ('draft', 'rejected'));
create policy listings_delete on public.listings for delete to authenticated using (private.owns_listing(id, true));
create policy photos_read on public.listing_photos for select to anon, authenticated using (private.public_listing(listing_id) or private.owns_listing(listing_id) or private.is_admin());
create policy verifications_read on public.verifications for select to authenticated using (private.owns_listing(listing_id) or private.is_admin());

-- Immutable relationships prevent moving reviewed content between properties.
create function private.guard_owner_writes() returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_table_name = 'boarding_houses' then
      if new.owner_id <> old.owner_id or new.id <> old.id then raise exception 'Property ownership cannot be changed.'; end if;
    elsif tg_table_name = 'rooms' then
      if new.boarding_house_id <> old.boarding_house_id or new.id <> old.id then raise exception 'A room cannot be moved to another property.'; end if;
    elsif tg_table_name = 'listings' then
      if new.id <> old.id or new.boarding_house_id <> old.boarding_house_id or new.listing_status <> old.listing_status or new.date_posted is distinct from old.date_posted then raise exception 'Use the listing workflow to change status.'; end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger houses_guard before update on public.boarding_houses for each row execute function private.guard_owner_writes();
create trigger rooms_guard before update on public.rooms for each row execute function private.guard_owner_writes();
create trigger listings_guard before update on public.listings for each row execute function private.guard_owner_writes();

-- Edits to the property behind a review invalidate that review, including direct API edits.
create function private.invalidate_house_listings() returns trigger language plpgsql security definer set search_path = '' as $$
declare house_id uuid;
begin
  if tg_table_name = 'boarding_houses' then
    house_id := new.id;
    if (to_jsonb(new) - 'updated_at') = (to_jsonb(old) - 'updated_at') then return new; end if;
  elsif tg_op = 'DELETE' then house_id := old.boarding_house_id;
  else house_id := new.boarding_house_id; end if;
  perform 1 from public.boarding_houses where id = house_id for update;
  update public.verifications set status = 'for_correction', date_reviewed = now(),
    remarks = 'Property information changed after submission. Please check the listing and resubmit.'
    where status = 'pending' and listing_id in (select id from public.listings where boarding_house_id = house_id);
  update public.listings set listing_status = 'draft', date_posted = null
    where boarding_house_id = house_id and listing_status in ('published', 'approved', 'for_review');
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger house_edits_review after update on public.boarding_houses for each row execute function private.invalidate_house_listings();
create trigger room_edits_review before insert or update or delete on public.rooms for each row execute function private.invalidate_house_listings();
create trigger amenity_edits_review before insert or delete on public.boarding_house_amenities for each row execute function private.invalidate_house_listings();

insert into public.amenities (name, description) values
 ('Wi-Fi', 'Internet access within the property'),
 ('Air Conditioning', 'Air-conditioned rooms'),
 ('Parking', 'On-site vehicle parking'),
 ('Kitchen', 'Shared or private cooking space'),
 ('Laundry Area', 'A dedicated area for laundry'),
 ('CCTV', 'Security cameras in common areas'),
 ('Water Supply', 'Regular water supply'),
 ('Study Area', 'A quiet space for work and study');

revoke all on all functions in schema private from public;
grant execute on function private.current_role(), private.is_admin(), private.owns_house(uuid), private.public_house(uuid), private.owns_listing(uuid, boolean), private.public_listing(uuid) to anon, authenticated;
