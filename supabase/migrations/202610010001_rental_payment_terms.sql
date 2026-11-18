-- Keep only current-month and advance payment terms.

alter table public.boarding_houses
  drop constraint if exists boarding_houses_current_month_required_check,
  drop constraint if exists boarding_houses_advance_months_required_check,
  alter column current_month_required drop default;

alter table public.boarding_houses
  alter column current_month_required type boolean
    using (current_month_required <> 0),
  alter column current_month_required set default true,
  alter column current_month_required set not null,
  alter column advance_months_required set default 0,
  drop column if exists deposit_months_required,
  drop column if exists security_deposit_months,
  drop column if exists minimum_stay_months;

alter table public.boarding_houses
  add constraint boarding_houses_advance_months_required_check
    check (advance_months_required between 0 and 6);

alter table public.rental_transactions
  drop constraint if exists rental_transactions_current_month_required_check,
  drop constraint if exists rental_transactions_advance_months_required_check;

alter table public.rental_transactions
  alter column current_month_required type boolean
    using (current_month_required <> 0),
  alter column current_month_required set default true,
  alter column current_month_required set not null,
  alter column advance_months_required set default 0,
  drop column if exists deposit_months_required,
  drop column if exists security_deposit_months,
  drop column if exists minimum_stay_months;

alter table public.rental_transactions
  add constraint rental_transactions_advance_months_required_check
    check (advance_months_required between 0 and 6);

update public.rental_transactions
set initial_payment_amount = monthly_rent * (
  case when current_month_required then 1 else 0 end
  + advance_months_required
);

create or replace function public.save_boarding_house(house_id uuid, details jsonb, amenity_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
declare current_required boolean := coalesce((details ->> 'current_month_required')::boolean, true);
declare advance_required integer := coalesce((details ->> 'advance_months_required')::integer, 0);
begin
  if private.current_role() is distinct from 'owner' then raise exception 'An active owner account is required.'; end if;
  if advance_required not between 0 and 6 then
    raise exception 'Advance payment must be between zero and six months.';
  end if;
  if house_id is not null then
    perform 1 from public.boarding_houses where id = house_id for update;
    if not private.owns_house(house_id) or exists (select 1 from public.boarding_houses where id = house_id and status = 'suspended') then raise exception 'Property cannot be edited.'; end if;
  end if;
  if coalesce(details ->> 'status', 'active') not in ('active', 'inactive') then raise exception 'Invalid property status.'; end if;
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

create or replace function public.submit_rental_request(target_room uuid, requested_start date, requested_type text, requested_end date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; declare room_status text;
begin
  if private.current_role() <> 'tenant' then raise exception 'Only an active tenant can request a rental.'; end if;
  if requested_type not in ('fixed_term', 'open_ended') then raise exception 'Choose a valid rental type.'; end if;
  if requested_start < current_date then raise exception 'Move-in date cannot be in the past.'; end if;
  if (requested_type = 'fixed_term' and (requested_end is null or requested_end <= requested_start))
    or (requested_type = 'open_ended' and requested_end is not null) then raise exception 'Enter a valid rental period.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_room::text, 0));
  select r.status into room_status
  from public.rooms r join public.boarding_houses h on h.id = r.boarding_house_id
  where r.id = target_room and h.status = 'active' and private.public_house(h.id);
  if not found or room_status <> 'available' then raise exception 'This room is not available for the selected rental period.'; end if;
  if not private.rental_period_available(target_room, requested_start, requested_end) then
    raise exception 'This room is not available for the selected rental period.';
  end if;
  insert into public.rental_requests (tenant_id, room_id, move_in_date, rental_type, expected_move_out_date)
  values (auth.uid(), target_room, requested_start, requested_type, requested_end) returning id into result;
  return result;
end;
$$;

create or replace function public.decide_rental_request(target_request uuid, decision text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare req public.rental_requests%rowtype; declare room_terms record; declare result uuid;
begin
  if decision not in ('approved', 'rejected') then raise exception 'Invalid rental request decision.'; end if;
  select * into req from public.rental_requests where id = target_request for update;
  if not found or not private.owns_room(req.room_id) then raise exception 'Rental request not found.'; end if;
  if req.status <> 'pending' then raise exception 'This request has already been decided.'; end if;
  if decision = 'rejected' then
    update public.rental_requests set status = 'rejected' where id = req.id;
    return null;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(req.room_id::text, 0));
  select r.monthly_rent, r.status as room_status, h.current_month_required, h.advance_months_required into room_terms
  from public.rooms r join public.boarding_houses h on h.id = r.boarding_house_id where r.id = req.room_id;
  if room_terms.room_status <> 'available' or not private.rental_period_available(req.room_id, req.move_in_date, req.expected_move_out_date) then
    raise exception 'This room is not available for the selected rental period.';
  end if;
  update public.rental_requests set status = 'approved' where id = req.id;
  insert into public.rental_transactions (
    request_id, tenant_id, room_id, start_date, expected_end_date, monthly_rent, rental_type,
    current_month_required, advance_months_required, initial_payment_amount
  ) values (
    req.id, req.tenant_id, req.room_id, req.move_in_date, req.expected_move_out_date, room_terms.monthly_rent, req.rental_type,
    room_terms.current_month_required, room_terms.advance_months_required,
    room_terms.monthly_rent * (
      case when room_terms.current_month_required then 1 else 0 end
      + room_terms.advance_months_required
    )
  ) returning id into result;
  update public.rental_requests set status = 'rejected'
  where room_id = req.room_id and status = 'pending' and id <> req.id
    and move_in_date < coalesce(req.expected_move_out_date, 'infinity'::date)
    and coalesce(expected_move_out_date, 'infinity'::date) > req.move_in_date;
  return result;
end;
$$;

create or replace function public.set_rental_end(target_rental uuid, expected_end date default null, actual_end date default null)
returns void language plpgsql security definer set search_path = '' as $$
declare rental public.rental_transactions%rowtype;
begin
  select * into rental from public.rental_transactions where id = target_rental for update;
  if not found or not private.owns_room(rental.room_id) then raise exception 'Rental not found.'; end if;
  if rental.status not in ('reserved', 'active', 'ending') then raise exception 'This rental cannot be ended.'; end if;
  if actual_end is not null then
    if actual_end < rental.start_date or actual_end > current_date then raise exception 'Actual move-out must be between move-in and today.'; end if;
    update public.rental_transactions set expected_end_date = coalesce(expected_end, rental.expected_end_date, actual_end),
      actual_end_date = actual_end, status = 'completed' where id = rental.id;
  else
    if expected_end is null or expected_end <= current_date or expected_end < rental.start_date then raise exception 'Choose a future expected move-out date.'; end if;
    update public.rental_transactions set expected_end_date = expected_end, status = 'ending' where id = rental.id;
  end if;
end;
$$;
