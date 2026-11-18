-- Let tenants withdraw an approved rental while it is still awaiting payment.

create or replace function public.cancel_rental_transaction(target_rental uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  rental public.rental_transactions%rowtype;
begin
  select * into rental
  from public.rental_transactions
  where id = target_rental
  for update;

  if not found or not (
    private.owns_room(rental.room_id)
    or (
      private.current_role() = 'tenant'
      and rental.tenant_id = auth.uid()
    )
  ) then
    raise exception 'Rental not found.';
  end if;

  if rental.status <> 'reserved' then
    raise exception 'Only a rental waiting for payment can be cancelled.';
  end if;

  if exists (
    select 1
    from public.payments p
    where p.rental_transaction_id = rental.id
      and p.payment_status = 'paid'
  ) then
    raise exception 'A paid rental cannot be cancelled.';
  end if;

  update public.rental_transactions
  set status = 'cancelled'
  where id = rental.id;

  update public.rental_requests
  set status = 'cancelled'
  where id = rental.rental_request_id;

  update public.payments
  set payment_status = 'cancelled'
  where rental_transaction_id = rental.id
    and payment_status = 'pending';
end;
$$;
