-- Phase 1 revision: property-owned photos and structured PSGC addresses.
-- Existing listing photo rows are preserved and attached to their property.

alter table public.boarding_houses rename column city to city_municipality;
alter table public.boarding_houses
  add column postal_code text check (postal_code is null or length(trim(postal_code)) between 3 and 12),
  add column province_code text check (province_code is null or province_code ~ '^[0-9]{10}$'),
  add column city_municipality_code text check (city_municipality_code is null or city_municipality_code ~ '^[0-9]{10}$'),
  add column barangay_code text check (barangay_code is null or barangay_code ~ '^[0-9]{10}$'),
  add constraint boarding_houses_psgc_address_complete check (
    (province_code is null and city_municipality_code is null and barangay_code is null)
    or
    (nullif(trim(province), '') is not null
      and nullif(trim(city_municipality), '') is not null
      and nullif(trim(barangay), '') is not null
      and province_code is not null
      and city_municipality_code is not null
      and barangay_code is not null)
  ),
  add constraint boarding_houses_psgc_barangay_parent check (
    barangay_code is null
    or case
      -- Manila barangays sit below PSGC sub-municipalities; the first five
      -- digits still identify their selected NCR locality.
      when province_code = '1300000000'
        then left(barangay_code, 5) = left(city_municipality_code, 5)
      else left(barangay_code, 7) = left(city_municipality_code, 7)
    end
  );

-- `approved` belongs to verification records; an approved listing is published.
update public.listings
set listing_status = 'published', date_posted = coalesce(date_posted, now())
where listing_status = 'approved';
alter table public.listings drop constraint listings_listing_status_check;
alter table public.listings add constraint listings_listing_status_check
  check (listing_status in ('draft', 'for_review', 'rejected', 'published', 'suspended'));

create table public.boarding_house_photos (
  id uuid primary key default gen_random_uuid(),
  boarding_house_id uuid not null references public.boarding_houses(id) on delete cascade,
  image_path text unique not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index boarding_house_photos_house on public.boarding_house_photos(boarding_house_id, created_at);
create unique index boarding_house_one_primary_photo
  on public.boarding_house_photos(boarding_house_id) where is_primary;

-- A property may have had photos on more than one listing. Preserve every
-- object and deterministically choose one primary photo per property.
with migrated as (
  select lp.id, l.boarding_house_id, lp.image_path, lp.created_at,
    row_number() over (
      partition by l.boarding_house_id
      order by lp.is_primary desc, lp.created_at, lp.id
    ) as property_rank
  from public.listing_photos lp
  join public.listings l on l.id = lp.listing_id
)
insert into public.boarding_house_photos
  (id, boarding_house_id, image_path, is_primary, created_at)
select id, boarding_house_id, image_path, property_rank = 1, created_at
from migrated;

-- Remove policies before replacing the helper functions they depend on.
drop policy if exists listing_storage_read on storage.objects;
drop policy if exists listing_storage_upload on storage.objects;
drop policy if exists listing_storage_delete on storage.objects;
drop function if exists public.add_listing_photo(uuid, text);
drop function if exists public.set_primary_photo(uuid);
drop function if exists public.remove_listing_photo(uuid);
drop function if exists private.can_read_photo_path(text);
drop function if exists private.can_manage_photo_path(text);
drop table public.listing_photos;

alter table public.boarding_house_photos enable row level security;
revoke all on public.boarding_house_photos from anon, authenticated;
grant select on public.boarding_house_photos to anon, authenticated;
-- Boarding houses are deactivated rather than hard-deleted from the client so
-- Storage objects cannot be orphaned by a direct table delete.
revoke insert, update, delete on public.boarding_houses from authenticated;
grant update (status) on public.boarding_houses to authenticated;
drop policy if exists houses_delete on public.boarding_houses;

create policy boarding_house_photos_read on public.boarding_house_photos
for select to anon, authenticated using (
  private.public_house(boarding_house_id)
  or private.owns_house(boarding_house_id)
  or private.is_admin()
);

-- New uploads use a semantically named private bucket. Keep the legacy bucket
-- private so migrated object paths remain readable. Supabase Storage metadata
-- is read-only for direct deletion; an empty legacy bucket can be removed later
-- through the Storage API or Dashboard after migrated paths are verified.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'boarding-house-photos',
  'boarding-house-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.can_manage_house_photo_path(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when object_name ~ '^boarding-houses/[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
    then split_part(object_name, '/', 2) = auth.uid()::text
      and private.owns_house(split_part(object_name, '/', 3)::uuid)
      and exists (
        select 1 from public.boarding_houses h
        where h.id = split_part(object_name, '/', 3)::uuid
          and h.status <> 'suspended'
      )
    else false
  end;
$$;

create function private.can_read_house_photo_path(bucket_name text, object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.boarding_house_photos p
    where p.image_path = object_name
      and (
        (bucket_name = 'boarding-house-photos' and object_name like 'boarding-houses/%')
        or (bucket_name = 'listing-photos' and object_name not like 'boarding-houses/%')
      )
      and (
        private.public_house(p.boarding_house_id)
        or private.owns_house(p.boarding_house_id)
        or private.is_admin()
      )
  );
$$;

create policy boarding_house_storage_read on storage.objects
for select to anon, authenticated using (
  bucket_id in ('boarding-house-photos', 'listing-photos')
  and private.can_read_house_photo_path(bucket_id, name)
);
create policy boarding_house_storage_upload on storage.objects
for insert to authenticated with check (
  bucket_id = 'boarding-house-photos'
  and private.can_manage_house_photo_path(name)
);
create policy boarding_house_storage_delete on storage.objects
for delete to authenticated using (
  (
    bucket_id = 'boarding-house-photos'
    and private.can_manage_house_photo_path(name)
  )
  or
  (
    bucket_id = 'listing-photos'
    and case
      when name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$'
      then split_part(name, '/', 1) = auth.uid()::text
        and private.current_role() = 'owner'
      else false
    end
  )
);
-- Replacing an image uploads a fresh UUID object and removes the old object.
-- Deliberately do not allow in-place Storage UPDATE operations.

create function public.add_boarding_house_photo(target_house uuid, object_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  perform 1 from public.boarding_houses where id = target_house for update;
  if not coalesce(private.owns_house(target_house), false)
    or not coalesce(private.can_manage_house_photo_path(object_path), false)
    or split_part(object_path, '/', 3) <> target_house::text
  then
    raise exception 'Photo does not belong to one of your boarding houses.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'boarding-house-photos' and name = object_path
  ) then
    raise exception 'Upload the image before saving its record.';
  end if;
  if (select count(*) from public.boarding_house_photos where boarding_house_id = target_house) >= 12 then
    raise exception 'A boarding house can have up to 12 photos.';
  end if;
  insert into public.boarding_house_photos (boarding_house_id, image_path, is_primary)
  values (
    target_house,
    object_path,
    not exists (
      select 1 from public.boarding_house_photos where boarding_house_id = target_house
    )
  )
  returning id into result;
  return result;
end;
$$;

create function public.set_primary_boarding_house_photo(target_photo uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_house uuid;
begin
  select boarding_house_id into target_house
  from public.boarding_house_photos where id = target_photo;
  perform 1 from public.boarding_houses where id = target_house for update;
  if not coalesce(private.owns_house(target_house), false)
    or exists (
      select 1 from public.boarding_houses
      where id = target_house and status = 'suspended'
    )
  then
    raise exception 'Only photos on your boarding houses can be changed.';
  end if;
  update public.boarding_house_photos
    set is_primary = false
    where boarding_house_id = target_house and is_primary and id <> target_photo;
  update public.boarding_house_photos
    set is_primary = true
    where id = target_photo and boarding_house_id = target_house;
  if not found then raise exception 'Photo no longer exists.'; end if;
end;
$$;

create function public.remove_boarding_house_photo(target_photo uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare target_house uuid; object_path text;
begin
  select boarding_house_id into target_house
  from public.boarding_house_photos where id = target_photo;
  perform 1 from public.boarding_houses where id = target_house for update;
  if not coalesce(private.owns_house(target_house), false)
    or exists (
      select 1 from public.boarding_houses
      where id = target_house and status = 'suspended'
    )
  then
    raise exception 'Only photos on your boarding houses can be removed.';
  end if;
  delete from public.boarding_house_photos
    where id = target_photo returning image_path into object_path;
  if object_path is null then raise exception 'Photo no longer exists.'; end if;
  if not exists (
    select 1 from public.boarding_house_photos
    where boarding_house_id = target_house and is_primary
  ) then
    update public.boarding_house_photos set is_primary = true
    where id = (
      select id from public.boarding_house_photos
      where boarding_house_id = target_house
      order by created_at, id limit 1
    );
  end if;
  return object_path;
end;
$$;

create function public.replace_boarding_house_photo(target_photo uuid, object_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare target_house uuid; old_path text;
begin
  select boarding_house_id, image_path into target_house, old_path
  from public.boarding_house_photos where id = target_photo;
  perform 1 from public.boarding_houses where id = target_house for update;
  if not coalesce(private.owns_house(target_house), false)
    or not coalesce(private.can_manage_house_photo_path(object_path), false)
    or split_part(object_path, '/', 3) <> target_house::text
  then
    raise exception 'Replacement photo does not belong to one of your boarding houses.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'boarding-house-photos' and name = object_path
  ) then
    raise exception 'Upload the replacement image before saving its record.';
  end if;
  update public.boarding_house_photos set image_path = object_path
  where id = target_photo and boarding_house_id = target_house;
  if not found then raise exception 'Photo no longer exists.'; end if;
  return old_path;
end;
$$;

-- Property photo changes affect what an administrator reviewed.
create trigger boarding_house_photo_edits_review
before insert or update or delete on public.boarding_house_photos
for each row execute function private.invalidate_house_listings();

create or replace function public.save_boarding_house(house_id uuid, details jsonb, amenity_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.current_role() is distinct from 'owner' then
    raise exception 'An active owner account is required.';
  end if;
  if house_id is not null then
    perform 1 from public.boarding_houses where id = house_id for update;
    if not private.owns_house(house_id) or exists (
      select 1 from public.boarding_houses where id = house_id and status = 'suspended'
    ) then
      raise exception 'Property cannot be edited.';
    end if;
  end if;
  if coalesce(details ->> 'status', 'active') not in ('active', 'inactive') then
    raise exception 'Invalid property status.';
  end if;
  if nullif(trim(details ->> 'province'), '') is null
    or nullif(trim(details ->> 'city_municipality'), '') is null
    or nullif(trim(details ->> 'barangay'), '') is null
    or coalesce(details ->> 'province_code', '') !~ '^[0-9]{10}$'
    or coalesce(details ->> 'city_municipality_code', '') !~ '^[0-9]{10}$'
    or coalesce(details ->> 'barangay_code', '') !~ '^[0-9]{10}$'
  then
    raise exception 'Choose a valid province, city or municipality, and barangay.';
  end if;
  if house_id is null then
    insert into public.boarding_houses (
      owner_id, name, description, street, barangay, city_municipality,
      province, postal_code, barangay_code, city_municipality_code,
      province_code, contact_number, house_rules, status
    ) values (
      auth.uid(), details ->> 'name', nullif(details ->> 'description', ''),
      nullif(details ->> 'street', ''), details ->> 'barangay',
      details ->> 'city_municipality', details ->> 'province',
      nullif(details ->> 'postal_code', ''), details ->> 'barangay_code',
      details ->> 'city_municipality_code', details ->> 'province_code',
      nullif(details ->> 'contact_number', ''),
      nullif(details ->> 'house_rules', ''),
      coalesce(details ->> 'status', 'active')
    ) returning id into result;
  else
    update public.boarding_houses set
      name = details ->> 'name',
      description = nullif(details ->> 'description', ''),
      street = nullif(details ->> 'street', ''),
      barangay = details ->> 'barangay',
      city_municipality = details ->> 'city_municipality',
      province = details ->> 'province',
      postal_code = nullif(details ->> 'postal_code', ''),
      barangay_code = details ->> 'barangay_code',
      city_municipality_code = details ->> 'city_municipality_code',
      province_code = details ->> 'province_code',
      contact_number = nullif(details ->> 'contact_number', ''),
      house_rules = nullif(details ->> 'house_rules', ''),
      status = coalesce(details ->> 'status', 'active')
    where id = house_id returning id into result;
  end if;
  delete from public.boarding_house_amenities
    where boarding_house_id = result
      and not (amenity_id = any(coalesce(amenity_ids, '{}'::uuid[])));
  insert into public.boarding_house_amenities (boarding_house_id, amenity_id)
    select result, unnest(coalesce(amenity_ids, '{}'::uuid[]))
    on conflict do nothing;
  return result;
end;
$$;

create or replace function public.submit_listing(target_listing uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare house_id uuid;
begin
  select boarding_house_id into house_id from public.listings where id = target_listing;
  perform 1 from public.boarding_houses where id = house_id for update;
  perform 1 from public.listings where id = target_listing for update;
  if not coalesce(private.owns_listing(target_listing, true), false) then
    raise exception 'Only your draft or rejected listings can be submitted.';
  end if;
  if not exists (
    select 1 from public.boarding_houses
    where id = house_id and status = 'active'
      and province_code is not null
      and city_municipality_code is not null
      and barangay_code is not null
  ) then
    raise exception 'Activate the property and complete its PSGC address first.';
  end if;
  if not exists (
    select 1 from public.rooms
    where boarding_house_id = house_id and status = 'available'
  ) then
    raise exception 'Add at least one available room first.';
  end if;
  if not exists (
    select 1 from public.boarding_house_photos
    where boarding_house_id = house_id and is_primary
  ) then
    raise exception 'Upload a primary boarding house photo first.';
  end if;
  update public.listings set listing_status = 'for_review', date_posted = null
  where id = target_listing;
  insert into public.verifications (listing_id) values (target_listing);
end;
$$;

revoke all on function private.can_manage_house_photo_path(text),
  private.can_read_house_photo_path(text, text) from public;
grant execute on function private.can_manage_house_photo_path(text),
  private.can_read_house_photo_path(text, text) to anon, authenticated;
revoke all on function public.add_boarding_house_photo(uuid, text),
  public.set_primary_boarding_house_photo(uuid),
  public.remove_boarding_house_photo(uuid),
  public.replace_boarding_house_photo(uuid, text) from public, anon;
grant execute on function public.add_boarding_house_photo(uuid, text),
  public.set_primary_boarding_house_photo(uuid),
  public.remove_boarding_house_photo(uuid),
  public.replace_boarding_house_photo(uuid, text) to authenticated;
