-- Require owners to explain rejected rental requests and retain that feedback.

alter table public.rental_requests
  add column rejection_reason text;

update public.rental_requests
set rejection_reason = 'No reason was recorded for this earlier rejection.'
where status = 'rejected';

alter table public.rental_requests
  add constraint rental_requests_rejection_reason_check check (
    (status = 'rejected' and length(trim(rejection_reason)) between 5 and 1000)
    or (status <> 'rejected' and rejection_reason is null)
  );

comment on column public.rental_requests.rejection_reason is
  'Owner feedback shown to the tenant when a rental request is rejected.';

drop function public.decide_rental_request(uuid, text);

create function public.decide_rental_request(
  target_request uuid,
  decision text,
  rejection_reason text default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  req public.rental_requests%rowtype;
  room_terms record;
  result uuid;
  normalized_reason text := nullif(trim(rejection_reason), '');
begin
  if decision not in ('approved', 'rejected') then
    raise exception 'Invalid rental request decision.';
  end if;
  if decision = 'rejected' and coalesce(length(normalized_reason), 0) < 5 then
    raise exception 'Explain why the request was rejected (at least 5 characters).';
  end if;
  if length(normalized_reason) > 1000 then
    raise exception 'Use at most 1,000 characters for the rejection reason.';
  end if;

  select * into req
  from public.rental_requests
  where id = target_request
  for update;

  if not found or not private.owns_room(req.room_id) then
    raise exception 'Rental request not found.';
  end if;
  if req.status <> 'pending' then
    raise exception 'This request has already been decided.';
  end if;

  if decision = 'rejected' then
    update public.rental_requests
    set status = 'rejected', rejection_reason = normalized_reason
    where id = req.id;
    return null;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(req.room_id::text, 0));
  select
    r.monthly_rent,
    r.status as room_status,
    h.current_month_required,
    h.advance_months_required
  into room_terms
  from public.rooms r
  join public.boarding_houses h on h.id = r.boarding_house_id
  where r.id = req.room_id;

  if room_terms.room_status <> 'available'
    or not private.rental_period_available(
      req.room_id,
      req.move_in_date,
      req.expected_move_out_date
    ) then
    raise exception 'This room is not available for the selected rental period.';
  end if;

  update public.rental_requests
  set status = 'approved', rejection_reason = null
  where id = req.id;

  insert into public.rental_transactions (
    rental_request_id,
    tenant_id,
    room_id,
    start_date,
    expected_end_date,
    monthly_rent,
    rental_type,
    current_month_required,
    advance_months_required,
    initial_payment_amount
  ) values (
    req.id,
    req.tenant_id,
    req.room_id,
    req.move_in_date,
    req.expected_move_out_date,
    room_terms.monthly_rent,
    req.rental_type,
    room_terms.current_month_required,
    room_terms.advance_months_required,
    room_terms.monthly_rent * (
      case when room_terms.current_month_required then 1 else 0 end
      + room_terms.advance_months_required
    )
  ) returning id into result;

  update public.rental_requests
  set
    status = 'rejected',
    rejection_reason = 'Another rental request for this room was approved.'
  where room_id = req.room_id and status = 'pending' and id <> req.id;

  return result;
end;
$$;

revoke all on function public.decide_rental_request(uuid, text, text)
  from public, anon;
grant execute on function public.decide_rental_request(uuid, text, text)
  to authenticated;
