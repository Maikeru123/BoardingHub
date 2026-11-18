-- Phase 2: public discovery and private tenant-to-owner inquiries.

create table public.inquiry_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'closed')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.inquiry_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message text not null check (length(trim(message)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create unique index inquiry_threads_one_open_per_listing
  on public.inquiry_threads(tenant_id, listing_id) where status = 'open';
create index inquiry_threads_tenant_last_message
  on public.inquiry_threads(tenant_id, last_message_at desc, created_at desc);
create index inquiry_threads_listing_last_message
  on public.inquiry_threads(listing_id, last_message_at desc, created_at desc);
create index inquiry_messages_thread_created
  on public.inquiry_messages(thread_id, created_at, id);
create index inquiry_messages_sender on public.inquiry_messages(sender_id);
create index inquiry_messages_created on public.inquiry_messages(created_at desc);
create index inquiry_messages_unread
  on public.inquiry_messages(thread_id, created_at) where read_at is null;

create trigger inquiry_threads_updated before update on public.inquiry_threads
for each row execute function private.touch_updated_at();

create function private.owns_inquiry_listing(target_listing uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() = 'owner' and exists (
    select 1
    from public.listings l
    join public.boarding_houses h on h.id = l.boarding_house_id
    where l.id = target_listing and h.owner_id = (select auth.uid())
  );
$$;

create function private.can_access_inquiry(target_thread uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.inquiry_threads t
    where t.id = target_thread
      and private.current_role() in ('tenant', 'owner')
      and (
        t.tenant_id = (select auth.uid())
        or private.owns_inquiry_listing(t.listing_id)
      )
  );
$$;

create function private.can_read_inquiry_profile(target_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() in ('tenant', 'owner') and exists (
    select 1
    from public.inquiry_threads t
    join public.listings l on l.id = t.listing_id
    join public.boarding_houses h on h.id = l.boarding_house_id
    where (
      t.tenant_id = (select auth.uid()) and h.owner_id = target_profile
    ) or (
      h.owner_id = (select auth.uid()) and t.tenant_id = target_profile
    )
  );
$$;

create function private.has_inquiry_for_listing(target_listing uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() in ('tenant', 'owner') and exists (
    select 1 from public.inquiry_threads t
    where t.listing_id = target_listing
      and (t.tenant_id = auth.uid() or private.owns_inquiry_listing(t.listing_id))
  );
$$;

create function private.has_inquiry_for_house(target_house uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() in ('tenant', 'owner') and exists (
    select 1
    from public.inquiry_threads t
    join public.listings l on l.id = t.listing_id
    where l.boarding_house_id = target_house
      and (t.tenant_id = auth.uid() or private.owns_inquiry_listing(t.listing_id))
  );
$$;

alter table public.inquiry_threads enable row level security;
alter table public.inquiry_messages enable row level security;

revoke all on public.inquiry_threads, public.inquiry_messages from anon, authenticated;
grant select, insert on public.inquiry_threads to authenticated;
grant select, insert on public.inquiry_messages to authenticated;
grant update (read_at) on public.inquiry_messages to authenticated;

create policy inquiry_threads_read on public.inquiry_threads
for select to authenticated using (
  (private.current_role() = 'tenant' and tenant_id = (select auth.uid()))
  or private.owns_inquiry_listing(listing_id)
);
create policy inquiry_threads_tenant_insert on public.inquiry_threads
for insert to authenticated with check (
  private.current_role() = 'tenant'
  and tenant_id = (select auth.uid())
  and status = 'open'
  and private.public_listing(listing_id)
);

create policy inquiry_messages_read on public.inquiry_messages
for select to authenticated using (private.can_access_inquiry(thread_id));
create policy inquiry_messages_insert on public.inquiry_messages
for insert to authenticated with check (
  sender_id = (select auth.uid())
  and private.can_access_inquiry(thread_id)
  and exists (
    select 1 from public.inquiry_threads t
    where t.id = thread_id and t.status = 'open'
  )
);
create policy inquiry_messages_recipient_read on public.inquiry_messages
for update to authenticated using (
  sender_id <> (select auth.uid()) and private.can_access_inquiry(thread_id)
) with check (
  sender_id <> (select auth.uid()) and private.can_access_inquiry(thread_id)
);

create policy profiles_inquiry_participants on public.profiles
for select to authenticated using (private.can_read_inquiry_profile(id));
create policy listings_inquiry_participants on public.listings
for select to authenticated using (private.has_inquiry_for_listing(id));
create policy houses_inquiry_participants on public.boarding_houses
for select to authenticated using (private.has_inquiry_for_house(id));
create policy boarding_house_photos_inquiry_participants on public.boarding_house_photos
for select to authenticated using (private.has_inquiry_for_house(boarding_house_id));

create or replace function private.can_read_house_photo_path(bucket_name text, object_name text)
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
        or private.has_inquiry_for_house(p.boarding_house_id)
      )
  );
$$;

create function private.bump_inquiry_thread()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.inquiry_threads
  set last_message_at = new.created_at, updated_at = new.created_at
  where id = new.thread_id;
  return new;
end;
$$;
create trigger inquiry_message_updates_thread
after insert on public.inquiry_messages
for each row execute function private.bump_inquiry_thread();

create function public.start_inquiry(target_listing uuid, first_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.current_role() <> 'tenant' then
    raise exception 'Only an active tenant can start an inquiry.';
  end if;
  if length(trim(coalesce(first_message, ''))) not between 1 and 4000 then
    raise exception 'Enter a message between 1 and 4,000 characters.';
  end if;
  if not coalesce(private.public_listing(target_listing), false) then
    raise exception 'This listing is not available for inquiries.';
  end if;

  select id into result from public.inquiry_threads
  where tenant_id = auth.uid() and listing_id = target_listing and status = 'open'
  for update;

  if result is null then
    begin
      insert into public.inquiry_threads (tenant_id, listing_id)
      values (auth.uid(), target_listing) returning id into result;
    exception when unique_violation then
      select id into result from public.inquiry_threads
      where tenant_id = auth.uid() and listing_id = target_listing and status = 'open';
    end;
  end if;

  insert into public.inquiry_messages (thread_id, sender_id, message)
  values (result, auth.uid(), trim(first_message));
  return result;
end;
$$;

create function public.send_inquiry_message(target_thread uuid, body text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if length(trim(coalesce(body, ''))) not between 1 and 4000 then
    raise exception 'Enter a message between 1 and 4,000 characters.';
  end if;
  if not coalesce(private.can_access_inquiry(target_thread), false) then
    raise exception 'You cannot access this inquiry.';
  end if;
  if not exists (
    select 1 from public.inquiry_threads where id = target_thread and status = 'open'
  ) then
    raise exception 'This inquiry is closed.';
  end if;
  insert into public.inquiry_messages (thread_id, sender_id, message)
  values (target_thread, auth.uid(), trim(body)) returning id into result;
  return result;
end;
$$;

create function public.mark_inquiry_read(target_thread uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not coalesce(private.can_access_inquiry(target_thread), false) then
    raise exception 'You cannot access this inquiry.';
  end if;
  update public.inquiry_messages
  set read_at = now()
  where thread_id = target_thread
    and sender_id <> auth.uid()
    and read_at is null;
end;
$$;

create function public.set_inquiry_status(target_thread uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_listing uuid;
begin
  if new_status not in ('open', 'closed') then
    raise exception 'Invalid inquiry status.';
  end if;
  select listing_id into target_listing from public.inquiry_threads where id = target_thread;
  if target_listing is null or not coalesce(private.owns_inquiry_listing(target_listing), false) then
    raise exception 'Only the property owner can change this inquiry.';
  end if;
  update public.inquiry_threads set status = new_status where id = target_thread;
end;
$$;

-- Public owner information is deliberately limited to a display name.
create function public.get_public_owner_profile(target_house uuid)
returns table (id uuid, first_name text, last_name text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.first_name, p.last_name
  from public.boarding_houses h
  join public.profiles p on p.id = h.owner_id
  where h.id = target_house and private.public_house(h.id);
$$;

create function public.list_inquiry_summaries(
  page_size integer default 30,
  page_offset integer default 0
)
returns table (
  thread_id uuid,
  tenant_id uuid,
  listing_id uuid,
  thread_status text,
  thread_created_at timestamptz,
  thread_updated_at timestamptz,
  last_message_at timestamptz,
  listing_title text,
  house_id uuid,
  house_name text,
  primary_photo_path text,
  other_profile_id uuid,
  other_first_name text,
  other_last_name text,
  latest_message_id uuid,
  latest_message text,
  latest_sender_id uuid,
  latest_message_created_at timestamptz,
  latest_message_read_at timestamptz,
  unread_count bigint,
  total_count bigint
)
language sql stable security definer set search_path = '' as $$
  with visible as (
    select t.*, l.title as listing_title, h.id as house_id, h.name as house_name,
      h.owner_id,
      case when t.tenant_id = auth.uid() then h.owner_id else t.tenant_id end as other_profile_id
    from public.inquiry_threads t
    join public.listings l on l.id = t.listing_id
    join public.boarding_houses h on h.id = l.boarding_house_id
    where private.current_role() in ('tenant', 'owner')
      and (t.tenant_id = auth.uid() or h.owner_id = auth.uid())
  )
  select v.id, v.tenant_id, v.listing_id, v.status, v.created_at, v.updated_at,
    v.last_message_at, v.listing_title, v.house_id, v.house_name,
    photo.image_path, p.id, p.first_name, p.last_name,
    latest.id, latest.message, latest.sender_id, latest.created_at, latest.read_at,
    coalesce(unread.unread_count, 0), count(*) over()
  from visible v
  join public.profiles p on p.id = v.other_profile_id
  left join lateral (
    select bhp.image_path from public.boarding_house_photos bhp
    where bhp.boarding_house_id = v.house_id and bhp.is_primary limit 1
  ) photo on true
  left join lateral (
    select m.id, m.message, m.sender_id, m.created_at, m.read_at
    from public.inquiry_messages m
    where m.thread_id = v.id
    order by m.created_at desc, m.id desc limit 1
  ) latest on true
  left join lateral (
    select count(*) as unread_count from public.inquiry_messages m
    where m.thread_id = v.id and m.sender_id <> auth.uid() and m.read_at is null
  ) unread on true
  order by coalesce(v.last_message_at, v.created_at) desc
  limit least(greatest(page_size, 1), 50)
  offset greatest(page_offset, 0);
$$;

-- Search, relational filters, sorting, and pagination execute in PostgreSQL.
-- The app signs the returned private Storage object path before rendering it.
create function public.discover_boarding_houses(
  search_text text default null,
  province_filter text default null,
  city_filter text default null,
  barangay_filter text default null,
  minimum_rent numeric default null,
  maximum_rent numeric default null,
  room_type_filter text default null,
  amenity_filters uuid[] default null,
  minimum_capacity integer default null,
  available_only boolean default false,
  sort_by text default 'newest',
  page_size integer default 12,
  page_offset integer default 0
)
returns table (
  listing_id uuid,
  house_id uuid,
  house_name text,
  house_description text,
  barangay text,
  city_municipality text,
  province text,
  postal_code text,
  listing_title text,
  listing_description text,
  date_posted timestamptz,
  primary_photo_path text,
  starting_rent numeric,
  available_room_count bigint,
  room_types text[],
  amenities jsonb,
  total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with candidates as (
    select
      l.id as listing_id,
      h.id as house_id,
      h.name as house_name,
      h.description as house_description,
      h.barangay,
      h.city_municipality,
      h.province,
      h.postal_code,
      l.title as listing_title,
      l.description as listing_description,
      l.date_posted,
      photo.image_path as primary_photo_path,
      room_summary.starting_rent,
      coalesce(room_summary.available_room_count, 0) as available_room_count,
      coalesce(room_summary.room_types, '{}'::text[]) as room_types,
      coalesce(amenity_summary.amenities, '[]'::jsonb) as amenities
    from (
      select distinct on (boarding_house_id) *
      from public.listings
      where listing_status = 'published'
      order by boarding_house_id, date_posted desc nulls last, created_at desc
    ) l
    join public.boarding_houses h on h.id = l.boarding_house_id
    left join lateral (
      select p.image_path
      from public.boarding_house_photos p
      where p.boarding_house_id = h.id and p.is_primary
      limit 1
    ) photo on true
    left join lateral (
      select min(r.monthly_rent) as starting_rent,
        count(*) as available_room_count,
        array_agg(distinct r.room_type order by r.room_type) as room_types
      from public.rooms r
      where r.boarding_house_id = h.id and r.status = 'available'
    ) room_summary on true
    left join lateral (
      select jsonb_agg(
        jsonb_build_object('id', a.id, 'name', a.name)
        order by a.name
      ) as amenities
      from public.boarding_house_amenities bha
      join public.amenities a on a.id = bha.amenity_id
      where bha.boarding_house_id = h.id
    ) amenity_summary on true
    where h.status = 'active'
      and (
        nullif(trim(search_text), '') is null
        or h.name ilike '%' || trim(search_text) || '%'
        or l.title ilike '%' || trim(search_text) || '%'
        or h.barangay ilike '%' || trim(search_text) || '%'
        or h.city_municipality ilike '%' || trim(search_text) || '%'
        or h.province ilike '%' || trim(search_text) || '%'
      )
      and (province_filter is null or h.province_code = province_filter)
      and (city_filter is null or h.city_municipality_code = city_filter)
      and (barangay_filter is null or h.barangay_code = barangay_filter)
      and (
        coalesce(cardinality(amenity_filters), 0) = 0
        or (
          select count(distinct bha.amenity_id)
          from public.boarding_house_amenities bha
          where bha.boarding_house_id = h.id
            and bha.amenity_id = any(amenity_filters)
        ) = cardinality(amenity_filters)
      )
      and (
        not available_only
        or exists (
          select 1 from public.rooms r
          where r.boarding_house_id = h.id and r.status = 'available'
        )
      )
      and (
        minimum_rent is null and maximum_rent is null
          and room_type_filter is null and minimum_capacity is null
        or exists (
          select 1 from public.rooms r
          where r.boarding_house_id = h.id and r.status = 'available'
            and (minimum_rent is null or r.monthly_rent >= minimum_rent)
            and (maximum_rent is null or r.monthly_rent <= maximum_rent)
            and (room_type_filter is null or r.room_type = room_type_filter)
            and (minimum_capacity is null or r.capacity >= minimum_capacity)
        )
      )
  ), counted as (
    select candidates.*, count(*) over() as total_count from candidates
  )
  select * from counted
  order by
    case when sort_by = 'price_low' then starting_rent end asc nulls last,
    case when sort_by = 'price_high' then starting_rent end desc nulls last,
    case when sort_by = 'name' then lower(house_name) end asc,
    case when sort_by not in ('price_low', 'price_high', 'name') then date_posted end desc nulls last,
    house_name asc
  limit least(greatest(page_size, 1), 48)
  offset greatest(page_offset, 0);
$$;

revoke all on function private.owns_inquiry_listing(uuid),
  private.can_access_inquiry(uuid), private.can_read_inquiry_profile(uuid),
  private.has_inquiry_for_listing(uuid), private.has_inquiry_for_house(uuid),
  private.bump_inquiry_thread() from public;
grant execute on function private.owns_inquiry_listing(uuid),
  private.can_access_inquiry(uuid), private.can_read_inquiry_profile(uuid),
  private.has_inquiry_for_listing(uuid), private.has_inquiry_for_house(uuid)
  to authenticated;

revoke all on function public.start_inquiry(uuid, text),
  public.send_inquiry_message(uuid, text), public.mark_inquiry_read(uuid),
  public.set_inquiry_status(uuid, text), public.get_public_owner_profile(uuid),
  public.list_inquiry_summaries(integer, integer),
  public.discover_boarding_houses(text,text,text,text,numeric,numeric,text,uuid[],integer,boolean,text,integer,integer)
  from public, anon;
grant execute on function public.start_inquiry(uuid, text),
  public.send_inquiry_message(uuid, text), public.mark_inquiry_read(uuid),
  public.set_inquiry_status(uuid, text) to authenticated;
grant execute on function public.get_public_owner_profile(uuid),
  public.discover_boarding_houses(text,text,text,text,numeric,numeric,text,uuid[],integer,boolean,text,integer,integer)
  to anon, authenticated;
grant execute on function public.list_inquiry_summaries(integer, integer)
  to authenticated;
