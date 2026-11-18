-- Boarding-house verification is the gate for room creation. Listings remain
-- separate publication records because inquiries and reports reference them;
-- the verifications table remains as read-only legacy review history.

alter table public.boarding_houses
  add column verification_status text not null default 'draft',
  add column verification_remarks text,
  add column verification_submitted_at timestamptz,
  add column verified_by uuid references public.profiles(id) on delete set null,
  add column verified_at timestamptz;

with latest as (
  select distinct on (l.boarding_house_id)
    l.boarding_house_id, v.status, v.remarks, v.date_submitted,
    v.admin_id, v.date_reviewed
  from public.verifications v
  join public.listings l on l.id = v.listing_id
  order by l.boarding_house_id, v.date_submitted desc, v.id desc
)
update public.boarding_houses h set
  verification_status = case
    when exists (
      select 1 from public.listings l
      where l.boarding_house_id = h.id and l.listing_status = 'published'
    ) then 'approved'
    when exists (
      select 1 from public.listings l
      where l.boarding_house_id = h.id and l.listing_status = 'for_review'
    ) then 'pending'
    when latest.status in ('rejected', 'for_correction') then latest.status
    else 'draft'
  end,
  verification_remarks = latest.remarks,
  verification_submitted_at = latest.date_submitted,
  verified_by = latest.admin_id,
  verified_at = latest.date_reviewed
from latest
where latest.boarding_house_id = h.id;

-- Houses without legacy review rows still need a deterministic backfill.
update public.boarding_houses h set verification_status = case
  when exists (
    select 1 from public.listings l
    where l.boarding_house_id = h.id and l.listing_status = 'published'
  ) then 'approved'
  when exists (
    select 1 from public.listings l
    where l.boarding_house_id = h.id and l.listing_status = 'for_review'
  ) then 'pending'
  else verification_status
end;

alter table public.boarding_houses
  add constraint boarding_houses_verification_status_check
    check (verification_status in ('draft', 'pending', 'approved', 'rejected', 'for_correction')),
  add constraint boarding_houses_verification_remarks_check
    check (verification_remarks is null or length(verification_remarks) <= 3000),
  add constraint boarding_houses_verification_dates_check
    check (
      (verification_status = 'pending' and verification_submitted_at is not null and verified_at is null)
      or verification_status <> 'pending'
    );

create index boarding_houses_verification_queue
  on public.boarding_houses(verification_submitted_at)
  where verification_status = 'pending' and status = 'active';

-- Normalize the final remaining deactivation state and prevent it returning.
update public.rooms set status = 'archived' where status = 'inactive';
alter table public.rooms drop constraint if exists rooms_status_check;
alter table public.rooms add constraint rooms_status_check
  check (status in ('available', 'maintenance', 'archived'));

-- Single rooms always store capacity one even through direct API writes.
update public.rooms set capacity = 1 where room_type = 'single';
alter table public.rooms add constraint rooms_single_capacity_check
  check (room_type <> 'single' or capacity = 1);

create function private.normalize_room_capacity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.room_type = 'single' then new.capacity := 1; end if;
  return new;
end;
$$;
create trigger rooms_normalize_capacity
before insert or update of room_type, capacity on public.rooms
for each row execute function private.normalize_room_capacity();

-- Public visibility now requires boarding-house approval as well as a
-- published listing and active owner/property.
create or replace function private.public_house(house_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.boarding_houses h
    join public.profiles p on p.id = h.owner_id
    where h.id = house_id
      and h.status = 'active'
      and h.verification_status = 'approved'
      and p.status = 'active'
      and exists (
        select 1 from public.listings l
        where l.boarding_house_id = h.id and l.listing_status = 'published'
      )
  );
$$;

drop policy if exists rooms_insert on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists houses_insert on public.boarding_houses;
create policy houses_insert on public.boarding_houses for insert to authenticated
with check (
  private.current_role() = 'owner'
  and owner_id = (select auth.uid())
  and status in ('active', 'archived')
  and verification_status = 'draft'
  and verification_remarks is null
  and verification_submitted_at is null
  and verified_by is null
  and verified_at is null
);
create policy rooms_insert on public.rooms for insert to authenticated
with check (
  private.owns_house(boarding_house_id)
  and exists (
    select 1 from public.boarding_houses h
    where h.id = boarding_house_id
      and h.status = 'active'
      and h.verification_status = 'approved'
  )
);
create policy rooms_update on public.rooms for update to authenticated
using (private.owns_house(boarding_house_id))
with check (
  private.owns_house(boarding_house_id)
  and (
    status = 'archived'
    or exists (
      select 1 from public.boarding_houses h
      where h.id = boarding_house_id
        and h.status = 'active'
        and h.verification_status = 'approved'
    )
  )
);

-- Archiving replaces owner deletion. Historical children remain intact.
drop policy if exists houses_delete on public.boarding_houses;
drop policy if exists rooms_delete on public.rooms;
revoke delete on public.boarding_houses, public.rooms from authenticated;

-- Owners may never change review metadata through a direct table update.
create or replace function private.guard_owner_writes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_table_name = 'boarding_houses' then
      if new.owner_id <> old.owner_id or new.id <> old.id then
        raise exception 'Property ownership cannot be changed.';
      end if;
      if new.verification_status is distinct from old.verification_status
        or new.verification_remarks is distinct from old.verification_remarks
        or new.verification_submitted_at is distinct from old.verification_submitted_at
        or new.verified_by is distinct from old.verified_by
        or new.verified_at is distinct from old.verified_at then
        raise exception 'Use the boarding house verification workflow to change review status.';
      end if;
    elsif tg_table_name = 'rooms' then
      if new.boarding_house_id <> old.boarding_house_id or new.id <> old.id then
        raise exception 'A room cannot be moved to another property.';
      end if;
    elsif tg_table_name = 'listings' then
      if new.id <> old.id or new.boarding_house_id <> old.boarding_house_id
        or new.listing_status <> old.listing_status
        or new.date_posted is distinct from old.date_posted then
        raise exception 'Use the listing workflow to change status.';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- Property facts and property photos invalidate an in-flight or completed
-- review. Room changes do not: rooms are moderated separately.
drop trigger if exists room_edits_review on public.rooms;
create or replace function private.invalidate_house_listings()
returns trigger language plpgsql security definer set search_path = '' as $$
declare house_id uuid;
declare core_changed boolean := true;
begin
  if tg_table_name = 'boarding_houses' then
    house_id := new.id;
    core_changed :=
      (to_jsonb(new) - array[
        'updated_at', 'status', 'verification_status', 'verification_remarks',
        'verification_submitted_at', 'verified_by', 'verified_at',
        'current_month_required', 'advance_months_required'
      ]) is distinct from
      (to_jsonb(old) - array[
        'updated_at', 'status', 'verification_status', 'verification_remarks',
        'verification_submitted_at', 'verified_by', 'verified_at',
        'current_month_required', 'advance_months_required'
      ]);
  elsif tg_op = 'DELETE' then
    house_id := old.boarding_house_id;
  else
    house_id := new.boarding_house_id;
  end if;

  if not core_changed then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  update public.boarding_houses set
    verification_status = 'for_correction',
    verification_remarks = 'Property information changed after submission. Please review the updates and resubmit.',
    verified_by = null,
    verified_at = null
  where id = house_id and verification_status in ('pending', 'approved');

  update public.listings set listing_status = 'draft', date_posted = null
  where boarding_house_id = house_id
    and listing_status in ('published', 'for_review');

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create function public.submit_boarding_house(target_house uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare house public.boarding_houses%rowtype;
begin
  select * into house from public.boarding_houses where id = target_house for update;
  if not found or not private.owns_house(target_house) then
    raise exception 'Boarding house not found.';
  end if;
  if house.status <> 'active' then
    raise exception 'Only an active boarding house can be submitted.';
  end if;
  if house.verification_status not in ('draft', 'rejected', 'for_correction') then
    raise exception 'This boarding house is not ready for submission.';
  end if;
  if house.province_code is null or house.city_municipality_code is null
    or house.barangay_code is null then
    raise exception 'Complete the boarding house address before submitting.';
  end if;
  if not exists (
    select 1 from public.boarding_house_photos p
    where p.boarding_house_id = target_house and p.is_primary
  ) then
    raise exception 'Add a primary boarding house photo before submitting.';
  end if;
  update public.boarding_houses set
    verification_status = 'pending',
    verification_remarks = null,
    verification_submitted_at = now(),
    verified_by = null,
    verified_at = null
  where id = target_house;
end;
$$;

create function public.review_boarding_house(
  target_house uuid, decision text, review_remarks text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Administrator access required.'; end if;
  if decision not in ('approved', 'rejected', 'for_correction') then
    raise exception 'Invalid review decision.';
  end if;
  if decision <> 'approved' and coalesce(length(trim(review_remarks)), 0) < 5 then
    raise exception 'Please explain the rejection or correction (at least 5 characters).';
  end if;
  update public.boarding_houses set
    verification_status = decision,
    verification_remarks = nullif(trim(review_remarks), ''),
    verified_by = auth.uid(),
    verified_at = now()
  where id = target_house and status = 'active' and verification_status = 'pending';
  if not found then raise exception 'This boarding house is no longer awaiting review.'; end if;
end;
$$;

-- A verified property may publish its listing without a second verification.
create or replace function public.submit_listing(target_listing uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare house_id uuid;
begin
  if not private.owns_listing(target_listing, true) then
    raise exception 'Only an editable listing you own can be published.';
  end if;
  select boarding_house_id into house_id from public.listings where id = target_listing for update;
  if not exists (
    select 1 from public.boarding_houses h
    where h.id = house_id and h.status = 'active' and h.verification_status = 'approved'
  ) then raise exception 'The boarding house must be approved before publishing.'; end if;
  if not exists (
    select 1 from public.rooms r
    where r.boarding_house_id = house_id and r.status = 'available'
  ) then raise exception 'Add at least one available room before publishing.'; end if;
  if not exists (
    select 1 from public.boarding_house_photos p
    where p.boarding_house_id = house_id and p.is_primary
  ) then raise exception 'Add a primary boarding house photo before publishing.'; end if;
  update public.listings set listing_status = 'published', date_posted = now()
  where id = target_listing;
end;
$$;

create function public.moderate_room(target_room uuid, new_status text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'Administrator access required.'; end if;
  if new_status not in ('available', 'maintenance', 'archived') then
    raise exception 'Invalid room status.';
  end if;
  update public.rooms set status = new_status where id = target_room;
  if not found then raise exception 'Room not found.'; end if;
end;
$$;

-- Pending requests cannot survive an archive operation, while accepted rental,
-- payment, and review history remains untouched.
create function private.cancel_requests_for_archive()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'boarding_houses'
    and new.status = 'archived' and old.status is distinct from new.status then
    update public.rental_requests rr set status = 'cancelled'
    where rr.status = 'pending' and rr.room_id in (
      select r.id from public.rooms r where r.boarding_house_id = new.id
    );
  elsif tg_table_name = 'rooms'
    and new.status = 'archived' and old.status is distinct from new.status then
    update public.rental_requests set status = 'cancelled'
    where room_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;
create trigger houses_cancel_requests_on_archive
after update of status on public.boarding_houses
for each row execute function private.cancel_requests_for_archive();
create trigger rooms_cancel_requests_on_archive
after update of status on public.rooms
for each row execute function private.cancel_requests_for_archive();

revoke all on function private.normalize_room_capacity(),
  private.cancel_requests_for_archive() from public;
revoke all on function public.submit_boarding_house(uuid),
  public.review_boarding_house(uuid, text, text),
  public.moderate_room(uuid, text) from public, anon;
grant execute on function public.submit_boarding_house(uuid),
  public.review_boarding_house(uuid, text, text),
  public.moderate_room(uuid, text) to authenticated;
