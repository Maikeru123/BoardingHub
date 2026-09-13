-- Run only from a trusted database session after the intended administrator
-- has registered and confirmed their email. This is deliberately not a migration.
-- psql "$env:SUPABASE_DB_URL" -v admin_id="AUTH_USER_UUID" -f supabase/bootstrap-admin.sql
\set ON_ERROR_STOP on
begin;
select set_config('boardinghub.bootstrap_admin_id', :'admin_id', true);
do $$
begin
  if not exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = current_setting('boardinghub.bootstrap_admin_id')::uuid
      and u.email_confirmed_at is not null and p.status = 'active'
  ) then
    raise exception 'A confirmed Auth user with an active profile is required.';
  end if;
  update public.profiles set role = 'admin'
    where id = current_setting('boardinghub.bootstrap_admin_id')::uuid;
end;
$$;
commit;
