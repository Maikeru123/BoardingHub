-- Archive semantics, room-owned photos, occupancy-aware discovery, and
-- calendar-month payment enforcement.

alter table public.boarding_houses
  drop constraint if exists boarding_houses_status_check;

update public.boarding_houses set status = 'archived' where status = 'inactive';

alter table public.boarding_houses
  add constraint boarding_houses_status_check
    check (status in ('active', 'archived', 'suspended'));

alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check
  check (status in ('available', 'maintenance', 'inactive', 'archived'));

drop policy if exists houses_insert on public.boarding_houses;
drop policy if exists houses_update on public.boarding_houses;
create policy houses_insert on public.boarding_houses for insert to authenticated
with check (
  private.current_role() = 'owner'
  and owner_id = (select auth.uid())
  and status in ('active', 'archived')
);
create policy houses_update on public.boarding_houses for update to authenticated
using (private.owns_house(id) and status <> 'suspended')
with check (
  private.owns_house(id)
  and owner_id = (select auth.uid())
  and status in ('active', 'archived')
);

drop policy if exists rooms_read on public.rooms;
create function private.room_currently_occupied(target_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rental_transactions t
    where t.room_id = target_room
      and t.status in ('active', 'ending')
      and t.start_date <= current_date
      and coalesce(t.actual_end_date, t.expected_end_date, 'infinity'::date) > current_date
  );
$$;
create policy rooms_read on public.rooms for select to anon, authenticated using (
  (
    status = 'available'
    and private.public_house(boarding_house_id)
    and not private.room_currently_occupied(id)
  )
  or private.owns_house(boarding_house_id)
  or private.is_admin()
);
drop policy if exists rooms_insert on public.rooms;
drop policy if exists rooms_update on public.rooms;
create policy rooms_insert on public.rooms for insert to authenticated with check (
  private.owns_house(boarding_house_id)
  and exists (
    select 1 from public.boarding_houses h
    where h.id = boarding_house_id and h.status = 'active'
  )
);
create policy rooms_update on public.rooms for update to authenticated
using (private.owns_house(boarding_house_id))
with check (
  private.owns_house(boarding_house_id)
  and exists (
    select 1 from public.boarding_houses h
    where h.id = boarding_house_id and h.status = 'active'
  )
);

create table public.room_photos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  image_path text unique not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index room_photos_room on public.room_photos(room_id, created_at);
create unique index room_one_primary_photo
  on public.room_photos(room_id) where is_primary;

alter table public.room_photos enable row level security;
revoke all on public.room_photos from anon, authenticated;
grant select on public.room_photos to anon, authenticated;
create policy room_photos_read on public.room_photos for select to anon, authenticated using (
  exists (
    select 1 from public.rooms r
    where r.id = room_id
      and (
        (r.status = 'available' and private.public_house(r.boarding_house_id)
          and not private.room_currently_occupied(r.id))
        or private.owns_house(r.boarding_house_id)
        or private.is_admin()
      )
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'room-photos',
  'room-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create function private.can_manage_room_photo_path(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() = 'owner'
    and split_part(object_name, '/', 1) = 'rooms'
    and split_part(object_name, '/', 2) = auth.uid()::text
    and split_part(object_name, '/', 3) ~ '^[0-9a-f-]{36}$'
    and private.owns_room(split_part(object_name, '/', 3)::uuid);
$$;

create function private.can_read_room_photo_path(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.room_photos p
    join public.rooms r on r.id = p.room_id
    where p.image_path = object_name
      and (
        (r.status = 'available' and private.public_house(r.boarding_house_id)
          and not private.room_currently_occupied(r.id))
        or private.owns_house(r.boarding_house_id)
        or private.is_admin()
      )
  );
$$;

create policy room_photos_storage_insert on storage.objects for insert to authenticated
with check (bucket_id = 'room-photos' and private.can_manage_room_photo_path(name));
create policy room_photos_storage_read on storage.objects for select to anon, authenticated
using (bucket_id = 'room-photos' and private.can_read_room_photo_path(name));
create policy room_photos_storage_delete on storage.objects for delete to authenticated
using (bucket_id = 'room-photos' and private.can_manage_room_photo_path(name));

create function public.add_room_photo(target_room uuid, object_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  perform 1 from public.rooms where id = target_room for update;
  if not coalesce(private.owns_room(target_room), false)
    or not coalesce(private.can_manage_room_photo_path(object_path), false)
    or split_part(object_path, '/', 3) <> target_room::text then
    raise exception 'Photo does not belong to one of your rooms.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'room-photos' and name = object_path
  ) then raise exception 'Upload the image before saving its record.'; end if;
  if (select count(*) from public.room_photos where room_id = target_room) >= 12 then
    raise exception 'A room can have up to 12 photos.';
  end if;
  insert into public.room_photos (room_id, image_path, is_primary)
  values (
    target_room,
    object_path,
    not exists (select 1 from public.room_photos where room_id = target_room)
  ) returning id into result;
  return result;
end;
$$;

create function public.set_primary_room_photo(target_photo uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_room uuid;
begin
  select room_id into target_room from public.room_photos where id = target_photo;
  perform 1 from public.rooms where id = target_room for update;
  if not coalesce(private.owns_room(target_room), false) then
    raise exception 'Only photos on your rooms can be changed.';
  end if;
  update public.room_photos set is_primary = false
  where room_id = target_room and is_primary and id <> target_photo;
  update public.room_photos set is_primary = true
  where id = target_photo and room_id = target_room;
  if not found then raise exception 'Photo no longer exists.'; end if;
end;
$$;

create function public.remove_room_photo(target_photo uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare target_room uuid; object_path text;
begin
  select room_id into target_room from public.room_photos where id = target_photo;
  perform 1 from public.rooms where id = target_room for update;
  if not coalesce(private.owns_room(target_room), false) then
    raise exception 'Only photos on your rooms can be removed.';
  end if;
  delete from public.room_photos where id = target_photo returning image_path into object_path;
  if object_path is null then raise exception 'Photo no longer exists.'; end if;
  if not exists (select 1 from public.room_photos where room_id = target_room and is_primary) then
    update public.room_photos set is_primary = true where id = (
      select id from public.room_photos
      where room_id = target_room order by created_at, id limit 1
    );
  end if;
  return object_path;
end;
$$;

create function public.replace_room_photo(target_photo uuid, object_path text)
returns text language plpgsql security definer set search_path = '' as $$
declare target_room uuid; old_path text;
begin
  select room_id, image_path into target_room, old_path
  from public.room_photos where id = target_photo;
  perform 1 from public.rooms where id = target_room for update;
  if not coalesce(private.owns_room(target_room), false)
    or not coalesce(private.can_manage_room_photo_path(object_path), false)
    or split_part(object_path, '/', 3) <> target_room::text then
    raise exception 'Replacement photo does not belong to one of your rooms.';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = 'room-photos' and name = object_path
  ) then raise exception 'Upload the replacement image before saving its record.'; end if;
  update public.room_photos set image_path = object_path
  where id = target_photo and room_id = target_room;
  if not found then raise exception 'Photo no longer exists.'; end if;
  return old_path;
end;
$$;

create or replace function public.save_boarding_house(house_id uuid, details jsonb, amenity_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
declare current_required boolean := coalesce((details ->> 'current_month_required')::boolean, true);
declare advance_required integer := coalesce((details ->> 'advance_months_required')::integer, 0);
begin
  if private.current_role() is distinct from 'owner' then raise exception 'An active owner account is required.'; end if;
  if advance_required not between 0 and 6 then raise exception 'Advance payment must be between zero and six months.'; end if;
  if house_id is not null then
    perform 1 from public.boarding_houses where id = house_id for update;
    if not private.owns_house(house_id) or exists (select 1 from public.boarding_houses where id = house_id and status = 'suspended') then raise exception 'Property cannot be edited.'; end if;
  end if;
  if coalesce(details ->> 'status', 'active') not in ('active', 'archived') then raise exception 'Invalid property status.'; end if;
  if nullif(trim(details ->> 'province'), '') is null
    or nullif(trim(details ->> 'city_municipality'), '') is null
    or nullif(trim(details ->> 'barangay'), '') is null
    or coalesce(details ->> 'province_code', '') !~ '^[0-9]{10}$'
    or coalesce(details ->> 'city_municipality_code', '') !~ '^[0-9]{10}$'
    or coalesce(details ->> 'barangay_code', '') !~ '^[0-9]{10}$' then
    raise exception 'Choose a valid province, city or municipality, and barangay.';
  end if;
  if house_id is null then
    insert into public.boarding_houses (
      owner_id, name, description, street, barangay, city_municipality, province, postal_code,
      barangay_code, city_municipality_code, province_code, contact_number, house_rules, status,
      current_month_required, advance_months_required
    ) values (
      auth.uid(), details ->> 'name', nullif(details ->> 'description', ''), nullif(details ->> 'street', ''),
      details ->> 'barangay', details ->> 'city_municipality', details ->> 'province', nullif(details ->> 'postal_code', ''),
      details ->> 'barangay_code', details ->> 'city_municipality_code', details ->> 'province_code',
      nullif(details ->> 'contact_number', ''), nullif(details ->> 'house_rules', ''), coalesce(details ->> 'status', 'active'),
      current_required, advance_required
    ) returning id into result;
  else
    update public.boarding_houses set
      name = details ->> 'name', description = nullif(details ->> 'description', ''), street = nullif(details ->> 'street', ''),
      barangay = details ->> 'barangay', city_municipality = details ->> 'city_municipality', province = details ->> 'province',
      postal_code = nullif(details ->> 'postal_code', ''), barangay_code = details ->> 'barangay_code',
      city_municipality_code = details ->> 'city_municipality_code', province_code = details ->> 'province_code',
      contact_number = nullif(details ->> 'contact_number', ''), house_rules = nullif(details ->> 'house_rules', ''),
      status = coalesce(details ->> 'status', 'active'), current_month_required = current_required,
      advance_months_required = advance_required
    where id = house_id returning id into result;
  end if;
  delete from public.boarding_house_amenities where boarding_house_id = result
    and not (amenity_id = any(coalesce(amenity_ids, '{}'::uuid[])));
  insert into public.boarding_house_amenities (boarding_house_id, amenity_id)
    select result, unnest(coalesce(amenity_ids, '{}'::uuid[])) on conflict do nothing;
  return result;
end;
$$;

create function public.get_public_room_states(target_house uuid)
returns table (room_id uuid, availability_state text, next_reserved_start date)
language sql stable security definer set search_path = '' as $$
  select r.id,
    case
      when exists (
        select 1 from public.rental_transactions t
        where t.room_id = r.id and t.status in ('active', 'ending')
          and t.start_date <= current_date
          and coalesce(t.actual_end_date, t.expected_end_date, 'infinity'::date) > current_date
      ) then 'occupied'
      when exists (
        select 1 from public.rental_transactions t
        where t.room_id = r.id and t.status = 'reserved' and t.start_date > current_date
      ) then 'future_reserved'
      else 'available'
    end,
    (
      select min(t.start_date) from public.rental_transactions t
      where t.room_id = r.id and t.status = 'reserved' and t.start_date > current_date
    )
  from public.rooms r
  where r.boarding_house_id = target_house
    and r.status = 'available'
    and private.public_house(target_house);
$$;

create or replace function public.discover_boarding_houses(
  search_text text default null, province_filter text default null,
  city_filter text default null, barangay_filter text default null,
  minimum_rent numeric default null, maximum_rent numeric default null,
  room_type_filter text default null, amenity_filters uuid[] default null,
  minimum_capacity integer default null, available_only boolean default false,
  sort_by text default 'newest', page_size integer default 12,
  page_offset integer default 0
)
returns table (
  listing_id uuid, house_id uuid, house_name text, house_description text,
  barangay text, city_municipality text, province text, postal_code text,
  listing_title text, listing_description text, date_posted timestamptz,
  primary_photo_path text, starting_rent numeric, available_room_count bigint,
  room_types text[], amenities jsonb, total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with candidates as (
    select l.id as listing_id, h.id as house_id, h.name as house_name,
      h.description as house_description, h.barangay, h.city_municipality,
      h.province, h.postal_code, l.title as listing_title,
      l.description as listing_description, l.date_posted,
      photo.image_path as primary_photo_path, room_summary.starting_rent,
      coalesce(room_summary.available_room_count, 0) as available_room_count,
      coalesce(room_summary.room_types, '{}'::text[]) as room_types,
      coalesce(amenity_summary.amenities, '[]'::jsonb) as amenities
    from (
      select distinct on (boarding_house_id) * from public.listings
      where listing_status = 'published'
      order by boarding_house_id, date_posted desc nulls last, created_at desc
    ) l
    join public.boarding_houses h on h.id = l.boarding_house_id
    left join lateral (
      select p.image_path from public.boarding_house_photos p
      where p.boarding_house_id = h.id and p.is_primary limit 1
    ) photo on true
    left join lateral (
      select min(r.monthly_rent) as starting_rent, count(*) as available_room_count,
        array_agg(distinct r.room_type order by r.room_type) as room_types
      from public.rooms r
      where r.boarding_house_id = h.id and r.status = 'available'
        and not private.room_currently_occupied(r.id)
    ) room_summary on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name) order by a.name) as amenities
      from public.boarding_house_amenities bha join public.amenities a on a.id = bha.amenity_id
      where bha.boarding_house_id = h.id
    ) amenity_summary on true
    where h.status = 'active'
      and (
        nullif(trim(search_text), '') is null or h.name ilike '%' || trim(search_text) || '%'
        or l.title ilike '%' || trim(search_text) || '%' or h.barangay ilike '%' || trim(search_text) || '%'
        or h.city_municipality ilike '%' || trim(search_text) || '%' or h.province ilike '%' || trim(search_text) || '%'
      )
      and (province_filter is null or h.province_code = province_filter)
      and (city_filter is null or h.city_municipality_code = city_filter)
      and (barangay_filter is null or h.barangay_code = barangay_filter)
      and (
        coalesce(cardinality(amenity_filters), 0) = 0 or (
          select count(distinct bha.amenity_id) from public.boarding_house_amenities bha
          where bha.boarding_house_id = h.id and bha.amenity_id = any(amenity_filters)
        ) = cardinality(amenity_filters)
      )
      and (not available_only or coalesce(room_summary.available_room_count, 0) > 0)
      and (
        minimum_rent is null and maximum_rent is null and room_type_filter is null and minimum_capacity is null
        or exists (
          select 1 from public.rooms r
          where r.boarding_house_id = h.id and r.status = 'available'
            and not private.room_currently_occupied(r.id)
            and (minimum_rent is null or r.monthly_rent >= minimum_rent)
            and (maximum_rent is null or r.monthly_rent <= maximum_rent)
            and (room_type_filter is null or r.room_type = room_type_filter)
            and (minimum_capacity is null or r.capacity >= minimum_capacity)
        )
      )
  ), counted as (
    select candidates.*, count(*) over() as total_count from candidates
  )
  select * from counted order by
    case when sort_by = 'price_low' then starting_rent end asc nulls last,
    case when sort_by = 'price_high' then starting_rent end desc nulls last,
    case when sort_by = 'name' then lower(house_name) end asc,
    case when sort_by not in ('price_low', 'price_high', 'name') then date_posted end desc nulls last,
    house_name asc
  limit least(greatest(page_size, 1), 48) offset greatest(page_offset, 0);
$$;

create function private.billing_anniversary(anchor_date date, months_after integer)
returns date language plpgsql immutable set search_path = '' as $$
declare target_month date; last_day integer; anchor_day integer;
begin
  target_month := (date_trunc('month', anchor_date)::date + make_interval(months => months_after))::date;
  last_day := extract(day from (target_month + interval '1 month - 1 day'))::integer;
  anchor_day := extract(day from anchor_date)::integer;
  return target_month + (least(anchor_day, last_day) - 1);
end;
$$;

create function private.next_monthly_period(target_rental uuid)
returns table (period_start date, period_end date)
language plpgsql stable security definer set search_path = '' as $$
declare rental public.rental_transactions%rowtype;
declare cycle integer; candidate date;
begin
  select * into rental from public.rental_transactions where id = target_rental;
  if not found then return; end if;
  cycle := (case when rental.current_month_required then 1 else 0 end) + rental.advance_months_required;
  loop
    candidate := private.billing_anniversary(rental.start_date, cycle);
    exit when not exists (
      select 1 from public.payments p
      where p.rental_transaction_id = rental.id and p.payment_type = 'monthly'
        and p.billing_period_start = candidate and p.payment_status = 'paid'
    );
    cycle := cycle + 1;
  end loop;
  period_start := candidate;
  period_end := private.billing_anniversary(rental.start_date, cycle + 1) - 1;
  return next;
end;
$$;

update storage.buckets set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
  file_size_limit = 5242880,
  public = false
where id = 'payment-proofs';

drop policy if exists payment_proofs_delete on storage.objects;
create policy payment_proofs_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and private.can_manage_payment_proof(name)
  and not exists (
    select 1 from public.payments p where p.proof_image_path = name
  )
);

create or replace function public.submit_payment(
  target_rental uuid, kind text, amount_paid numeric, method text,
  reference text default null, proof_path text default null,
  period_start date default null, period_end date default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rental public.rental_transactions%rowtype; declare result uuid;
declare expected_period record; declare proof_segment text;
begin
  select * into rental from public.rental_transactions where id = target_rental for update;
  if not found or private.current_role() <> 'tenant' or rental.tenant_id <> auth.uid() then raise exception 'Rental not found.'; end if;
  if rental.status not in ('reserved', 'active', 'ending') then raise exception 'Payments are closed for this rental.'; end if;
  if kind not in ('initial', 'monthly') or method not in ('cash', 'gcash') or amount_paid <= 0 then
    raise exception 'Enter valid payment details.';
  end if;
  if method = 'gcash' and (nullif(trim(reference), '') is null or proof_path is null) then
    raise exception 'GCash requires a reference number and proof image.';
  end if;
  if method = 'cash' then reference := null; proof_path := null; end if;
  if kind = 'initial' then
    if amount_paid <> rental.initial_payment_amount or period_start is not null or period_end is not null then
      raise exception 'Initial payment must match the required total.';
    end if;
    if rental.status <> 'reserved' then raise exception 'Initial payment is only accepted while a rental is reserved.'; end if;
    proof_segment := 'initial';
  else
    if rental.status not in ('active', 'ending') or (
      rental.initial_payment_amount > 0 and not exists (
        select 1 from public.payments p where p.rental_transaction_id = rental.id
          and p.payment_type = 'initial' and p.payment_status = 'paid'
      )
    ) then raise exception 'The initial payment must be confirmed before monthly payments.'; end if;
    select * into expected_period from private.next_monthly_period(rental.id);
    if period_start is distinct from expected_period.period_start
      or period_end is distinct from expected_period.period_end then
      raise exception 'Choose the next unpaid billing period.';
    end if;
    if amount_paid <> rental.monthly_rent then raise exception 'Monthly payment must match the snapshotted monthly rent.'; end if;
    proof_segment := period_start::text;
  end if;
  if proof_path is not null and proof_path not like
    auth.uid()::text || '/' || rental.id::text || '/' || proof_segment || '/%' then
    raise exception 'Invalid payment proof path.';
  end if;
  insert into public.payments (
    rental_transaction_id, payment_type, billing_period_start, billing_period_end,
    amount, payment_method, reference_number, proof_image_path
  ) values (
    rental.id, kind, period_start, period_end, amount_paid, method,
    nullif(trim(reference), ''), proof_path
  ) returning id into result;
  return result;
exception when unique_violation then
  raise exception 'A pending or paid payment already exists for this billing period.';
end;
$$;

revoke all on function private.can_manage_room_photo_path(text),
  private.can_read_room_photo_path(text), private.billing_anniversary(date, integer),
  private.next_monthly_period(uuid), private.room_currently_occupied(uuid) from public;
grant execute on function private.can_manage_room_photo_path(text),
  private.can_read_room_photo_path(text), private.room_currently_occupied(uuid)
  to anon, authenticated;

revoke all on function public.add_room_photo(uuid, text),
  public.set_primary_room_photo(uuid), public.remove_room_photo(uuid),
  public.replace_room_photo(uuid, text), public.get_public_room_states(uuid)
  from public, anon;
grant execute on function public.add_room_photo(uuid, text),
  public.set_primary_room_photo(uuid), public.remove_room_photo(uuid),
  public.replace_room_photo(uuid, text) to authenticated;
grant execute on function public.get_public_room_states(uuid) to anon, authenticated;
