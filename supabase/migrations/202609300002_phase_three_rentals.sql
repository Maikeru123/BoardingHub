-- Phase 3: date-safe rentals, payments, reviews, reports, and feedback.

alter table public.boarding_houses
  add column current_month_required integer not null default 1 check (current_month_required >= 0),
  add column advance_months_required integer not null default 0 check (advance_months_required >= 0),
  add column deposit_months_required integer not null default 0 check (deposit_months_required >= 0),
  add column minimum_stay_months integer check (minimum_stay_months is null or minimum_stay_months >= 0);

create table public.rental_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  move_in_date date not null,
  rental_type text not null check (rental_type in ('fixed_term', 'open_ended')),
  expected_move_out_date date,
  request_date timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (rental_type = 'fixed_term' and expected_move_out_date > move_in_date)
    or (rental_type = 'open_ended' and expected_move_out_date is null)
  )
);

create table public.rental_transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.rental_requests(id) on delete restrict,
  tenant_id uuid not null references public.profiles(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  start_date date not null,
  expected_end_date date,
  actual_end_date date,
  monthly_rent numeric(12,2) not null check (monthly_rent >= 0),
  rental_type text not null check (rental_type in ('fixed_term', 'open_ended')),
  current_month_required integer not null check (current_month_required >= 0),
  advance_months_required integer not null check (advance_months_required >= 0),
  deposit_months_required integer not null check (deposit_months_required >= 0),
  minimum_stay_months integer check (minimum_stay_months is null or minimum_stay_months >= 0),
  initial_payment_amount numeric(12,2) not null check (initial_payment_amount >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'active', 'ending', 'completed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (rental_type <> 'fixed_term' or expected_end_date > start_date),
  check (actual_end_date is null or actual_end_date >= start_date),
  check (status <> 'completed' or actual_end_date is not null),
  check (status <> 'ending' or expected_end_date is not null)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  rental_transaction_id uuid not null references public.rental_transactions(id) on delete restrict,
  payment_type text not null check (payment_type in ('initial', 'monthly', 'deposit', 'advance', 'other')),
  billing_period_start date,
  billing_period_end date,
  amount numeric(12,2) not null check (amount > 0),
  payment_date timestamptz not null default now(),
  payment_method text not null check (payment_method in ('cash', 'gcash', 'bank_transfer', 'other')),
  reference_number text check (reference_number is null or length(reference_number) <= 160),
  proof_image_path text,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'rejected', 'cancelled')),
  remarks text check (remarks is null or length(remarks) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (payment_type = 'monthly' and billing_period_start is not null and billing_period_end > billing_period_start)
    or (payment_type <> 'monthly' and billing_period_start is null and billing_period_end is null)
  )
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.profiles(id) on delete restrict,
  boarding_house_id uuid not null references public.boarding_houses(id) on delete restrict,
  rental_transaction_id uuid not null unique references public.rental_transactions(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  comment text check (comment is null or length(comment) <= 3000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  listing_id uuid not null references public.listings(id) on delete restrict,
  reason text not null check (length(trim(reason)) between 1 and 160),
  description text check (description is null or length(description) <= 3000),
  date_reported timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'under_review', 'resolved', 'dismissed'))
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  subject text not null check (length(trim(subject)) between 1 and 160),
  message text not null check (length(trim(message)) between 1 and 4000),
  date_submitted timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'under_review', 'resolved', 'dismissed'))
);

create index rental_requests_tenant on public.rental_requests(tenant_id, created_at desc);
create index rental_requests_room_status on public.rental_requests(room_id, status, move_in_date);
create index rental_transactions_tenant on public.rental_transactions(tenant_id, created_at desc);
create index rental_transactions_room_dates on public.rental_transactions(room_id, start_date, expected_end_date)
  where status in ('reserved', 'active', 'ending');
create index payments_transaction_date on public.payments(rental_transaction_id, payment_date desc);
create unique index payments_one_live_initial on public.payments(rental_transaction_id)
  where payment_type = 'initial' and payment_status in ('pending', 'paid');
create unique index payments_one_live_monthly_period on public.payments(rental_transaction_id, billing_period_start)
  where payment_type = 'monthly' and payment_status in ('pending', 'paid');
create index reviews_house_date on public.reviews(boarding_house_id, created_at desc) where status = 'published';
create index reports_status_date on public.reports(status, date_reported desc);
create index feedback_status_date on public.feedback(status, date_submitted desc);

create trigger rental_requests_updated before update on public.rental_requests
for each row execute function private.touch_updated_at();
create trigger rental_transactions_updated before update on public.rental_transactions
for each row execute function private.touch_updated_at();
create trigger payments_updated before update on public.payments
for each row execute function private.touch_updated_at();

create function private.owns_room(target_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() = 'owner' and exists (
    select 1 from public.rooms r join public.boarding_houses h on h.id = r.boarding_house_id
    where r.id = target_room and h.owner_id = (select auth.uid())
  );
$$;

create function private.can_access_rental(target_rental uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.rental_transactions t
    where t.id = target_rental and (
      (private.current_role() = 'tenant' and t.tenant_id = (select auth.uid()))
      or private.owns_room(t.room_id)
      or private.is_admin()
    )
  );
$$;

create function private.can_read_rental_profile(target_profile uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or exists (
    select 1 from public.rental_requests q
    where (q.tenant_id = auth.uid() and exists (
      select 1 from public.rooms r join public.boarding_houses h on h.id = r.boarding_house_id
      where r.id = q.room_id and h.owner_id = target_profile
    )) or (q.tenant_id = target_profile and private.owns_room(q.room_id))
  );
$$;

create function private.rental_period_available(
  target_room uuid, requested_start date, requested_end date, ignored_transaction uuid default null
)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.rental_transactions existing
    where existing.room_id = target_room
      and existing.status in ('reserved', 'active', 'ending')
      and (ignored_transaction is null or existing.id <> ignored_transaction)
      and requested_start < coalesce(existing.actual_end_date, existing.expected_end_date, 'infinity'::date)
      and coalesce(requested_end, 'infinity'::date) > existing.start_date
  );
$$;

create or replace function public.save_boarding_house(house_id uuid, details jsonb, amenity_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
declare current_required integer := coalesce((details ->> 'current_month_required')::integer, 1);
declare advance_required integer := coalesce((details ->> 'advance_months_required')::integer, 0);
declare deposit_required integer := coalesce((details ->> 'deposit_months_required')::integer, 0);
declare minimum_required integer := nullif(details ->> 'minimum_stay_months', '')::integer;
begin
  if private.current_role() is distinct from 'owner' then raise exception 'An active owner account is required.'; end if;
  if least(current_required, advance_required, deposit_required, coalesce(minimum_required, 0)) < 0 then
    raise exception 'Payment term months cannot be negative.';
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
      current_month_required, advance_months_required, deposit_months_required, minimum_stay_months
    ) values (
      auth.uid(), details ->> 'name', nullif(details ->> 'description', ''), nullif(details ->> 'street', ''),
      details ->> 'barangay', details ->> 'city_municipality', details ->> 'province', nullif(details ->> 'postal_code', ''),
      details ->> 'barangay_code', details ->> 'city_municipality_code', details ->> 'province_code',
      nullif(details ->> 'contact_number', ''), nullif(details ->> 'house_rules', ''), coalesce(details ->> 'status', 'active'),
      current_required, advance_required, deposit_required, minimum_required
    ) returning id into result;
  else
    update public.boarding_houses set
      name = details ->> 'name', description = nullif(details ->> 'description', ''), street = nullif(details ->> 'street', ''),
      barangay = details ->> 'barangay', city_municipality = details ->> 'city_municipality', province = details ->> 'province',
      postal_code = nullif(details ->> 'postal_code', ''), barangay_code = details ->> 'barangay_code',
      city_municipality_code = details ->> 'city_municipality_code', province_code = details ->> 'province_code',
      contact_number = nullif(details ->> 'contact_number', ''), house_rules = nullif(details ->> 'house_rules', ''),
      status = coalesce(details ->> 'status', 'active'), current_month_required = current_required,
      advance_months_required = advance_required, deposit_months_required = deposit_required,
      minimum_stay_months = minimum_required
    where id = house_id returning id into result;
  end if;
  delete from public.boarding_house_amenities where boarding_house_id = result
    and not (amenity_id = any(coalesce(amenity_ids, '{}'::uuid[])));
  insert into public.boarding_house_amenities (boarding_house_id, amenity_id)
    select result, unnest(coalesce(amenity_ids, '{}'::uuid[])) on conflict do nothing;
  return result;
end;
$$;

create function public.check_room_availability(target_room uuid, requested_start date, requested_end date default null)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if requested_start is null or (requested_end is not null and requested_end <= requested_start) then return false; end if;
  return exists (
    select 1 from public.rooms r join public.boarding_houses h on h.id = r.boarding_house_id
    where r.id = target_room and r.status = 'available' and h.status = 'active' and private.public_house(h.id)
  ) and private.rental_period_available(target_room, requested_start, requested_end);
end;
$$;

create function public.submit_rental_request(target_room uuid, requested_start date, requested_type text, requested_end date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; declare terms record;
begin
  if private.current_role() <> 'tenant' then raise exception 'Only an active tenant can request a rental.'; end if;
  if requested_type not in ('fixed_term', 'open_ended') then raise exception 'Choose a valid rental type.'; end if;
  if requested_start < current_date then raise exception 'Move-in date cannot be in the past.'; end if;
  if (requested_type = 'fixed_term' and (requested_end is null or requested_end <= requested_start))
    or (requested_type = 'open_ended' and requested_end is not null) then raise exception 'Enter a valid rental period.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_room::text, 0));
  select r.monthly_rent, r.status as room_status, h.minimum_stay_months into terms
  from public.rooms r join public.boarding_houses h on h.id = r.boarding_house_id
  where r.id = target_room and h.status = 'active' and private.public_house(h.id);
  if not found or terms.room_status <> 'available' then raise exception 'This room is not available for the selected rental period.'; end if;
  if requested_type = 'fixed_term' and terms.minimum_stay_months is not null
    and requested_end < (requested_start + make_interval(months => terms.minimum_stay_months))::date then
    raise exception 'The selected period is shorter than the minimum stay.';
  end if;
  if not private.rental_period_available(target_room, requested_start, requested_end) then
    raise exception 'This room is not available for the selected rental period.';
  end if;
  insert into public.rental_requests (tenant_id, room_id, move_in_date, rental_type, expected_move_out_date)
  values (auth.uid(), target_room, requested_start, requested_type, requested_end) returning id into result;
  return result;
end;
$$;

create function public.decide_rental_request(target_request uuid, decision text)
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
  select r.monthly_rent, r.status as room_status, h.current_month_required, h.advance_months_required,
    h.deposit_months_required, h.minimum_stay_months into room_terms
  from public.rooms r join public.boarding_houses h on h.id = r.boarding_house_id where r.id = req.room_id;
  if room_terms.room_status <> 'available' or not private.rental_period_available(req.room_id, req.move_in_date, req.expected_move_out_date) then
    raise exception 'This room is not available for the selected rental period.';
  end if;
  update public.rental_requests set status = 'approved' where id = req.id;
  insert into public.rental_transactions (
    request_id, tenant_id, room_id, start_date, expected_end_date, monthly_rent, rental_type,
    current_month_required, advance_months_required, deposit_months_required, minimum_stay_months, initial_payment_amount
  ) values (
    req.id, req.tenant_id, req.room_id, req.move_in_date, req.expected_move_out_date, room_terms.monthly_rent, req.rental_type,
    room_terms.current_month_required, room_terms.advance_months_required, room_terms.deposit_months_required,
    room_terms.minimum_stay_months,
    room_terms.monthly_rent * (room_terms.current_month_required + room_terms.advance_months_required + room_terms.deposit_months_required)
  ) returning id into result;
  update public.rental_requests set status = 'rejected'
  where room_id = req.room_id and status = 'pending' and id <> req.id
    and move_in_date < coalesce(req.expected_move_out_date, 'infinity'::date)
    and coalesce(expected_move_out_date, 'infinity'::date) > req.move_in_date;
  return result;
end;
$$;

create function public.cancel_rental_request(target_request uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.rental_requests set status = 'cancelled'
  where id = target_request and tenant_id = auth.uid() and private.current_role() = 'tenant' and status = 'pending';
  if not found then raise exception 'Only your pending request can be cancelled.'; end if;
end;
$$;

create function public.submit_payment(target_rental uuid, kind text, amount_paid numeric, method text,
  reference text default null, proof_path text default null, period_start date default null, period_end date default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rental public.rental_transactions%rowtype; declare result uuid;
begin
  select * into rental from public.rental_transactions where id = target_rental for update;
  if not found or private.current_role() <> 'tenant' or rental.tenant_id <> auth.uid() then raise exception 'Rental not found.'; end if;
  if rental.status not in ('reserved', 'active', 'ending') then raise exception 'Payments are closed for this rental.'; end if;
  if kind not in ('initial', 'monthly') or method not in ('cash', 'gcash', 'bank_transfer', 'other') or amount_paid <= 0 then
    raise exception 'Enter valid payment details.';
  end if;
  if kind = 'initial' and (amount_paid <> rental.initial_payment_amount or period_start is not null or period_end is not null) then
    raise exception 'Initial payment must match the required total.';
  end if;
  if kind = 'initial' and rental.status <> 'reserved' then
    raise exception 'Initial payment is only accepted while a rental is reserved.';
  end if;
  if kind = 'monthly' and (period_start is null or period_end <= period_start) then raise exception 'Enter a valid billing period.'; end if;
  if kind = 'monthly' and amount_paid <> rental.monthly_rent then
    raise exception 'Monthly payment must match the snapshotted monthly rent.';
  end if;
  if kind = 'monthly' and (rental.status not in ('active', 'ending') or (
    rental.initial_payment_amount > 0 and not exists (
      select 1 from public.payments p where p.rental_transaction_id = rental.id
        and p.payment_type = 'initial' and p.payment_status = 'paid'
    )
  )) then
    raise exception 'The initial payment must be confirmed before monthly payments.';
  end if;
  if proof_path is not null and proof_path not like auth.uid()::text || '/' || rental.id::text || '/%' then
    raise exception 'Invalid payment proof path.';
  end if;
  insert into public.payments (rental_transaction_id, payment_type, billing_period_start, billing_period_end,
    amount, payment_method, reference_number, proof_image_path)
  values (rental.id, kind, period_start, period_end, amount_paid, method, nullif(trim(reference), ''), proof_path)
  returning id into result;
  return result;
exception when unique_violation then
  raise exception 'A pending or paid payment already exists for this billing period.';
end;
$$;

create function public.review_payment(target_payment uuid, decision text, owner_remarks text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare payment public.payments%rowtype; declare rental public.rental_transactions%rowtype;
begin
  if decision not in ('paid', 'rejected') then raise exception 'Invalid payment decision.'; end if;
  select * into payment from public.payments where id = target_payment for update;
  if not found then raise exception 'Payment not found.'; end if;
  select * into rental from public.rental_transactions where id = payment.rental_transaction_id for update;
  if not private.owns_room(rental.room_id) then raise exception 'Payment not found.'; end if;
  if payment.payment_status <> 'pending' then raise exception 'This payment has already been reviewed.'; end if;
  update public.payments set payment_status = decision, remarks = nullif(trim(owner_remarks), '') where id = payment.id;
  if decision = 'paid' and payment.payment_type = 'initial' and rental.status = 'reserved' and rental.start_date <= current_date then
    update public.rental_transactions set status = 'active' where id = rental.id;
  end if;
end;
$$;

create function public.sync_rental_statuses()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.rental_transactions t set status = 'active'
  where t.status = 'reserved' and t.start_date <= current_date
    and (t.initial_payment_amount = 0 or exists (select 1 from public.payments p where p.rental_transaction_id = t.id and p.payment_type = 'initial' and p.payment_status = 'paid'))
    and (t.tenant_id = auth.uid() or private.owns_room(t.room_id) or private.is_admin());
end;
$$;

create function public.set_rental_end(target_rental uuid, expected_end date default null, actual_end date default null)
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
    if rental.minimum_stay_months is not null
      and expected_end < (rental.start_date + make_interval(months => rental.minimum_stay_months))::date then
      raise exception 'Expected move-out is earlier than the snapshotted minimum stay.';
    end if;
    update public.rental_transactions set expected_end_date = expected_end, status = 'ending' where id = rental.id;
  end if;
end;
$$;

create function public.cancel_rental_transaction(target_rental uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare rental public.rental_transactions%rowtype;
begin
  select * into rental from public.rental_transactions where id = target_rental for update;
  if not found or not private.owns_room(rental.room_id) then raise exception 'Rental not found.'; end if;
  if rental.status <> 'reserved' then raise exception 'Only a reserved rental can be cancelled.'; end if;
  if exists (select 1 from public.payments p where p.rental_transaction_id = rental.id and p.payment_status = 'paid') then
    raise exception 'A paid rental cannot be cancelled until its payment is resolved.';
  end if;
  update public.rental_transactions set status = 'cancelled' where id = rental.id;
  update public.rental_requests set status = 'cancelled' where id = rental.request_id;
  update public.payments set payment_status = 'cancelled' where rental_transaction_id = rental.id and payment_status = 'pending';
end;
$$;

create function public.submit_review(target_rental uuid, review_rating integer, review_comment text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid; declare house_id uuid;
begin
  if review_rating not between 1 and 5 then raise exception 'Rating must be between 1 and 5.'; end if;
  select r.boarding_house_id into house_id from public.rental_transactions t join public.rooms r on r.id = t.room_id
  where t.id = target_rental and t.tenant_id = auth.uid() and t.status = 'completed' and private.current_role() = 'tenant';
  if not found then raise exception 'Only a tenant with a completed rental can review this property.'; end if;
  insert into public.reviews (tenant_id, boarding_house_id, rental_transaction_id, rating, comment)
  values (auth.uid(), house_id, target_rental, review_rating, nullif(trim(review_comment), '')) returning id into result;
  return result;
exception when unique_violation then raise exception 'You already reviewed this rental.';
end;
$$;

create function public.submit_listing_report(target_listing uuid, report_reason text, report_description text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.current_role() is null then raise exception 'Sign in to report a listing.'; end if;
  if length(trim(coalesce(report_reason, ''))) not between 1 and 160 then raise exception 'Enter a report reason.'; end if;
  if not exists (select 1 from public.listings where id = target_listing and listing_status = 'published') then raise exception 'Listing not found.'; end if;
  insert into public.reports (user_id, listing_id, reason, description)
  values (auth.uid(), target_listing, trim(report_reason), nullif(trim(report_description), '')) returning id into result;
  return result;
end;
$$;

create function public.submit_feedback(feedback_subject text, feedback_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.current_role() is null then raise exception 'Sign in to send feedback.'; end if;
  insert into public.feedback (user_id, subject, message)
  values (auth.uid(), trim(feedback_subject), trim(feedback_message)) returning id into result;
  return result;
end;
$$;

create function public.moderate_report(target_report uuid, decision text, suspend_listing boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare target_listing uuid;
begin
  if not private.is_admin() then raise exception 'An active administrator account is required.'; end if;
  if decision not in ('under_review', 'resolved', 'dismissed') then raise exception 'Invalid report decision.'; end if;
  update public.reports set status = decision where id = target_report returning listing_id into target_listing;
  if not found then raise exception 'Report not found.'; end if;
  if suspend_listing then update public.listings set listing_status = 'suspended' where id = target_listing; end if;
end;
$$;

create function public.moderate_feedback(target_feedback uuid, decision text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'An active administrator account is required.'; end if;
  if decision not in ('under_review', 'resolved', 'dismissed') then raise exception 'Invalid feedback decision.'; end if;
  update public.feedback set status = decision where id = target_feedback;
  if not found then raise exception 'Feedback not found.'; end if;
end;
$$;

alter table public.rental_requests enable row level security;
alter table public.rental_transactions enable row level security;
alter table public.payments enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.feedback enable row level security;

revoke all on public.rental_requests, public.rental_transactions, public.payments, public.reviews, public.reports, public.feedback from anon, authenticated;
grant select on public.rental_requests, public.rental_transactions, public.payments, public.reviews, public.reports, public.feedback to authenticated;
grant select on public.reviews to anon;

create policy rental_requests_read on public.rental_requests for select to authenticated using (
  tenant_id = auth.uid() or private.owns_room(room_id) or private.is_admin()
);
create policy rental_transactions_read on public.rental_transactions for select to authenticated using (
  tenant_id = auth.uid() or private.owns_room(room_id) or private.is_admin()
);
create policy payments_read on public.payments for select to authenticated using (
  private.can_access_rental(rental_transaction_id)
);
create policy reviews_public_read on public.reviews for select to anon, authenticated using (
  status = 'published' or tenant_id = auth.uid() or private.is_admin()
);
create policy reports_read on public.reports for select to authenticated using (user_id = auth.uid() or private.is_admin());
create policy feedback_read on public.feedback for select to authenticated using (user_id = auth.uid() or private.is_admin());
create policy profiles_rental_participants on public.profiles for select to authenticated using (private.can_read_rental_profile(id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function private.can_manage_payment_proof(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.current_role() = 'tenant' and (string_to_array(object_name, '/'))[1] = auth.uid()::text
    and exists (select 1 from public.rental_transactions t where t.id::text = (string_to_array(object_name, '/'))[2] and t.tenant_id = auth.uid());
$$;
create function private.can_read_payment_proof(object_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.payments p where p.proof_image_path = object_name and private.can_access_rental(p.rental_transaction_id));
$$;
create policy payment_proofs_insert on storage.objects for insert to authenticated
with check (bucket_id = 'payment-proofs' and private.can_manage_payment_proof(name));
create policy payment_proofs_read on storage.objects for select to authenticated
using (bucket_id = 'payment-proofs' and (private.can_manage_payment_proof(name) or private.can_read_payment_proof(name)));
create policy payment_proofs_delete on storage.objects for delete to authenticated
using (bucket_id = 'payment-proofs' and private.can_manage_payment_proof(name));

revoke all on function private.owns_room(uuid), private.can_access_rental(uuid), private.can_read_rental_profile(uuid),
  private.rental_period_available(uuid,date,date,uuid), private.can_manage_payment_proof(text), private.can_read_payment_proof(text) from public;
grant execute on function private.owns_room(uuid), private.can_access_rental(uuid), private.can_read_rental_profile(uuid),
  private.rental_period_available(uuid,date,date,uuid), private.can_manage_payment_proof(text), private.can_read_payment_proof(text) to anon, authenticated;

revoke all on function public.check_room_availability(uuid,date,date), public.submit_rental_request(uuid,date,text,date),
  public.decide_rental_request(uuid,text), public.cancel_rental_request(uuid),
  public.submit_payment(uuid,text,numeric,text,text,text,date,date), public.review_payment(uuid,text,text),
  public.sync_rental_statuses(), public.set_rental_end(uuid,date,date), public.cancel_rental_transaction(uuid), public.submit_review(uuid,integer,text),
  public.submit_listing_report(uuid,text,text), public.submit_feedback(text,text), public.moderate_report(uuid,text,boolean),
  public.moderate_feedback(uuid,text) from public, anon;
grant execute on function public.check_room_availability(uuid,date,date) to anon, authenticated;
grant execute on function public.submit_rental_request(uuid,date,text,date), public.decide_rental_request(uuid,text),
  public.cancel_rental_request(uuid), public.submit_payment(uuid,text,numeric,text,text,text,date,date),
  public.review_payment(uuid,text,text), public.sync_rental_statuses(), public.set_rental_end(uuid,date,date), public.cancel_rental_transaction(uuid),
  public.submit_review(uuid,integer,text), public.submit_listing_report(uuid,text,text), public.submit_feedback(text,text),
  public.moderate_report(uuid,text,boolean), public.moderate_feedback(uuid,text) to authenticated;

