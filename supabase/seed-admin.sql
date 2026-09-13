-- Trusted, explicit seed step after Auth provisioning, not a signup trigger.
-- Run via npm run db:seed:admin. No password or API key belongs in this file.
do $$
declare
  admin_id uuid;
begin
  select id into strict admin_id
  from auth.users
  where lower(email) = lower(current_setting('boardinghub.seed_admin_email', true))
    and email_confirmed_at is not null;

  if not exists (
    select 1 from public.profiles where id = admin_id and status = 'active'
  ) then
    raise exception 'The seeded administrator must have an active profile; suspension is not overridden.';
  end if;

  update public.profiles
  set role = 'admin'
  where id = admin_id and role <> 'admin';
exception
  when no_data_found then
    raise exception 'Create and confirm the intended Auth account before seeding its admin role.';
  when too_many_rows then
    raise exception 'More than one Auth account matches the seed email; resolve this before continuing.';
end;
$$;
