-- Clarify ambiguous domain names without recreating tables or losing data.
-- Existing rows, privileges, RLS enablement, triggers, and foreign-key targets
-- are preserved by PostgreSQL's transactional rename operations.

begin;

alter table public.verifications rename to listing_verifications;
alter table public.reports rename to listing_reports;

alter table public.boarding_houses
  rename column verified_by to verified_by_admin_id;
alter table public.rental_transactions
  rename column request_id to rental_request_id;
alter table public.listing_reports
  rename column user_id to reporter_id;
alter table public.feedback
  rename column user_id to submitted_by_id;

-- Keep database object names aligned with the renamed tables and columns.
alter table public.listing_verifications
  rename constraint verifications_pkey to listing_verifications_pkey;
alter table public.listing_verifications
  rename constraint verifications_admin_id_fkey to listing_verifications_admin_id_fkey;
alter table public.listing_verifications
  rename constraint verifications_listing_id_fkey to listing_verifications_listing_id_fkey;
alter table public.listing_verifications
  rename constraint verifications_check to listing_verifications_review_state_check;
alter table public.listing_verifications
  rename constraint verifications_remarks_check to listing_verifications_remarks_check;
alter table public.listing_verifications
  rename constraint verifications_status_check to listing_verifications_status_check;

alter index public.verification_one_pending
  rename to listing_verifications_one_pending;
alter index public.verifications_admin
  rename to listing_verifications_admin;
alter index public.verifications_listing_date
  rename to listing_verifications_listing_date;
alter index public.verifications_pending
  rename to listing_verifications_pending;

alter table public.listing_reports
  rename constraint reports_pkey to listing_reports_pkey;
alter table public.listing_reports
  rename constraint reports_listing_id_fkey to listing_reports_listing_id_fkey;
alter table public.listing_reports
  rename constraint reports_user_id_fkey to listing_reports_reporter_id_fkey;
alter table public.listing_reports
  rename constraint reports_description_check to listing_reports_description_check;
alter table public.listing_reports
  rename constraint reports_reason_check to listing_reports_reason_check;
alter table public.listing_reports
  rename constraint reports_status_check to listing_reports_status_check;
alter index public.reports_status_date
  rename to listing_reports_status_date;

alter table public.boarding_houses
  rename constraint boarding_houses_verified_by_fkey
  to boarding_houses_verified_by_admin_id_fkey;
alter table public.rental_transactions
  rename constraint rental_transactions_request_id_fkey
  to rental_transactions_rental_request_id_fkey;
alter table public.rental_transactions
  rename constraint rental_transactions_request_id_key
  to rental_transactions_rental_request_id_key;
alter table public.feedback
  rename constraint feedback_user_id_fkey to feedback_submitted_by_id_fkey;

alter policy verifications_read on public.listing_verifications
  rename to listing_verifications_read;
alter policy reports_read on public.listing_reports
  rename to listing_reports_read;

comment on table public.listing_verifications is
  'Read-only historical listing-review records retained after verification moved to boarding_houses.';
comment on table public.listing_reports is
  'User reports submitted against published listings.';
comment on column public.boarding_houses.verified_by_admin_id is
  'Administrator profile that made the latest boarding-house verification decision.';
comment on column public.rental_transactions.rental_request_id is
  'Approved rental request that created this rental transaction.';
comment on column public.listing_reports.reporter_id is
  'Profile that submitted the listing report.';
comment on column public.feedback.submitted_by_id is
  'Profile that submitted the feedback item.';

-- PL/pgSQL bodies store column and table identifiers as source text, so the
-- affected functions are replaced in place after the safe renames.
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
        or new.verified_by_admin_id is distinct from old.verified_by_admin_id
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
        'verification_submitted_at', 'verified_by_admin_id', 'verified_at',
        'current_month_required', 'advance_months_required'
      ]) is distinct from
      (to_jsonb(old) - array[
        'updated_at', 'status', 'verification_status', 'verification_remarks',
        'verification_submitted_at', 'verified_by_admin_id', 'verified_at',
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
    verified_by_admin_id = null,
    verified_at = null
  where id = house_id and verification_status in ('pending', 'approved');

  update public.listings set listing_status = 'draft', date_posted = null
  where boarding_house_id = house_id
    and listing_status in ('published', 'for_review');

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

create or replace function public.submit_boarding_house(target_house uuid)
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
    verified_by_admin_id = null,
    verified_at = null
  where id = target_house;
end;
$$;

create or replace function public.review_boarding_house(
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
    verified_by_admin_id = auth.uid(),
    verified_at = now()
  where id = target_house and status = 'active' and verification_status = 'pending';
  if not found then raise exception 'This boarding house is no longer awaiting review.'; end if;
end;
$$;

-- Retain the legacy listing-review RPC for any pre-property-verification
-- records that are still awaiting a decision.
create or replace function public.review_listing(
  target_listing uuid, decision text, review_remarks text default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare house_id uuid;
begin
  if not private.is_admin() then
    raise exception 'An active administrator account is required.';
  end if;
  if decision not in ('approved', 'rejected', 'for_correction') then
    raise exception 'Invalid review decision.';
  end if;
  if decision <> 'approved' and coalesce(length(trim(review_remarks)), 0) < 5 then
    raise exception 'Please explain the rejection or correction (at least 5 characters).';
  end if;
  select boarding_house_id into house_id
  from public.listings where id = target_listing;
  perform 1 from public.boarding_houses where id = house_id for update;
  perform 1 from public.listings
  where id = target_listing and listing_status = 'for_review' for update;
  if not found then
    raise exception 'This listing is no longer awaiting review.';
  end if;
  if decision = 'approved' and not exists (
    select 1
    from public.boarding_houses h
    join public.profiles p on p.id = h.owner_id
    where h.id = house_id and h.status = 'active' and p.status = 'active'
  ) then
    raise exception 'Only an active property belonging to an active owner can be published.';
  end if;
  update public.listing_verifications set
    status = decision,
    admin_id = auth.uid(),
    date_reviewed = now(),
    remarks = nullif(trim(review_remarks), '')
  where listing_id = target_listing and status = 'pending';
  if not found then raise exception 'No pending verification exists.'; end if;
  update public.listings set
    listing_status = case decision
      when 'approved' then 'published'
      when 'rejected' then 'rejected'
      else 'draft'
    end,
    date_posted = case when decision = 'approved' then now() else null end
  where id = target_listing;
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
    rental_request_id, tenant_id, room_id, start_date, expected_end_date, monthly_rent, rental_type,
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

create or replace function public.cancel_rental_transaction(target_rental uuid)
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
  update public.rental_requests set status = 'cancelled' where id = rental.rental_request_id;
  update public.payments set payment_status = 'cancelled'
  where rental_transaction_id = rental.id and payment_status = 'pending';
end;
$$;

create or replace function public.submit_listing_report(
  target_listing uuid, report_reason text, report_description text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.current_role() is null then raise exception 'Sign in to report a listing.'; end if;
  if length(trim(coalesce(report_reason, ''))) not between 1 and 160 then raise exception 'Enter a report reason.'; end if;
  if not exists (select 1 from public.listings where id = target_listing and listing_status = 'published') then raise exception 'Listing not found.'; end if;
  insert into public.listing_reports (reporter_id, listing_id, reason, description)
  values (auth.uid(), target_listing, trim(report_reason), nullif(trim(report_description), ''))
  returning id into result;
  return result;
end;
$$;

create or replace function public.submit_feedback(feedback_subject text, feedback_message text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.current_role() is null then raise exception 'Sign in to send feedback.'; end if;
  insert into public.feedback (submitted_by_id, subject, message)
  values (auth.uid(), trim(feedback_subject), trim(feedback_message)) returning id into result;
  return result;
end;
$$;

create or replace function public.moderate_report(
  target_report uuid, decision text, suspend_listing boolean default false
)
returns void language plpgsql security definer set search_path = '' as $$
declare target_listing uuid;
begin
  if not private.is_admin() then raise exception 'An active administrator account is required.'; end if;
  if decision not in ('under_review', 'resolved', 'dismissed') then raise exception 'Invalid report decision.'; end if;
  update public.listing_reports set status = decision
  where id = target_report returning listing_id into target_listing;
  if not found then raise exception 'Report not found.'; end if;
  if suspend_listing then
    update public.listings set listing_status = 'suspended' where id = target_listing;
  end if;
end;
$$;

commit;
