-- Transactional owner/editor operations. All SECURITY DEFINER entrypoints check identity.
create function public.save_boarding_house(house_id uuid, details jsonb, amenity_ids uuid[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  if private.current_role() is distinct from 'owner' then raise exception 'An active owner account is required.'; end if;
  if house_id is not null then
    perform 1 from public.boarding_houses where id = house_id for update;
    if not private.owns_house(house_id) or exists (select 1 from public.boarding_houses where id = house_id and status = 'suspended') then raise exception 'Property cannot be edited.'; end if;
  end if;
  if coalesce(details ->> 'status', 'active') not in ('active', 'inactive') then raise exception 'Invalid property status.'; end if;
  if house_id is null then
    insert into public.boarding_houses (owner_id, name, description, street, barangay, city, province, latitude, longitude, contact_number, house_rules, status)
    values (auth.uid(), details ->> 'name', nullif(details ->> 'description',''), details ->> 'street', details ->> 'barangay', details ->> 'city', details ->> 'province',
      nullif(details ->> 'latitude','')::numeric, nullif(details ->> 'longitude','')::numeric, nullif(details ->> 'contact_number',''), details ->> 'house_rules', coalesce(details ->> 'status','active')) returning id into result;
  else
    update public.boarding_houses set name = details ->> 'name', description = nullif(details ->> 'description',''), street = details ->> 'street',
      barangay = details ->> 'barangay', city = details ->> 'city', province = details ->> 'province', latitude = nullif(details ->> 'latitude','')::numeric,
      longitude = nullif(details ->> 'longitude','')::numeric, contact_number = nullif(details ->> 'contact_number',''), house_rules = details ->> 'house_rules', status = coalesce(details ->> 'status','active')
    where id = house_id returning id into result;
  end if;
  delete from public.boarding_house_amenities where boarding_house_id = result and not (amenity_id = any(coalesce(amenity_ids, '{}'::uuid[])));
  insert into public.boarding_house_amenities (boarding_house_id, amenity_id)
    select result, unnest(coalesce(amenity_ids, '{}'::uuid[])) on conflict do nothing;
  return result;
end;
$$;

create function public.submit_listing(target_listing uuid) returns void language plpgsql security definer set search_path = '' as $$
declare house_id uuid;
begin
  select boarding_house_id into house_id from public.listings where id = target_listing;
  perform 1 from public.boarding_houses where id = house_id for update;
  perform 1 from public.listings where id = target_listing for update;
  if not coalesce(private.owns_listing(target_listing, true), false) then raise exception 'Only your draft or rejected listings can be submitted.'; end if;
  if not exists (select 1 from public.boarding_houses where id = house_id and status = 'active' and nullif(trim(city), '') is not null and nullif(trim(province), '') is not null) then raise exception 'Activate the property and add its city and province first.'; end if;
  if not exists (select 1 from public.rooms where boarding_house_id = house_id and status = 'available') then raise exception 'Add at least one available room first.'; end if;
  if not exists (select 1 from public.listing_photos where listing_id = target_listing and is_primary) then raise exception 'Upload a primary listing photo first.'; end if;
  update public.listings set listing_status = 'for_review', date_posted = null where id = target_listing;
  insert into public.verifications (listing_id) values (target_listing);
end;
$$;

create function public.review_listing(target_listing uuid, decision text, review_remarks text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare house_id uuid;
begin
  if not private.is_admin() then raise exception 'An active administrator account is required.'; end if;
  if decision not in ('approved', 'rejected', 'for_correction') then raise exception 'Invalid review decision.'; end if;
  if decision <> 'approved' and coalesce(length(trim(review_remarks)), 0) < 5 then raise exception 'Please explain the rejection or correction (at least 5 characters).'; end if;
  select boarding_house_id into house_id from public.listings where id = target_listing;
  perform 1 from public.boarding_houses where id = house_id for update;
  perform 1 from public.listings where id = target_listing and listing_status = 'for_review' for update;
  if not found then raise exception 'This listing is no longer awaiting review.'; end if;
  if decision = 'approved' and not exists (select 1 from public.boarding_houses h join public.profiles p on p.id = h.owner_id where h.id = house_id and h.status = 'active' and p.status = 'active') then raise exception 'Only an active property belonging to an active owner can be published.'; end if;
  update public.verifications set status = decision, admin_id = auth.uid(), date_reviewed = now(), remarks = nullif(trim(review_remarks), '')
    where listing_id = target_listing and status = 'pending';
  if not found then raise exception 'No pending verification exists.'; end if;
  update public.listings set listing_status = case decision when 'approved' then 'published' when 'rejected' then 'rejected' else 'draft' end,
    date_posted = case when decision = 'approved' then now() else null end where id = target_listing;
end;
$$;

create function public.set_account_status(target_user uuid, new_status text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'An active administrator account is required.'; end if;
  if new_status not in ('active', 'suspended') then raise exception 'Invalid account status.'; end if;
  if target_user = auth.uid() then raise exception 'You cannot change your own account status.'; end if;
  update public.profiles set status = new_status where id = target_user;
  if not found then raise exception 'Account not found.'; end if;
end;
$$;

-- Private bucket: draft and rejected photographs must never be public URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-photos', 'listing-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create function private.can_manage_photo_path(object_name text) returns boolean language sql stable security definer set search_path = '' as $$
  select split_part(object_name, '/', 1) = auth.uid()::text and exists (
    select 1 from public.listings l where l.id::text = split_part(object_name, '/', 2) and private.owns_listing(l.id, true)
  ) and object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$';
$$;
create function private.can_read_photo_path(object_name text) returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_admin() or private.can_manage_photo_path(object_name) or exists (
    select 1 from public.listing_photos p where p.image_path = object_name and (private.public_listing(p.listing_id) or private.owns_listing(p.listing_id))
  );
$$;
create policy listing_storage_read on storage.objects for select to anon, authenticated using (bucket_id = 'listing-photos' and private.can_read_photo_path(name));
create policy listing_storage_upload on storage.objects for insert to authenticated with check (bucket_id = 'listing-photos' and private.can_manage_photo_path(name));
create policy listing_storage_delete on storage.objects for delete to authenticated using (bucket_id = 'listing-photos' and private.can_manage_photo_path(name));
-- No UPDATE policy: new UUID object names prevent overwriting an approved image.

create function public.add_listing_photo(target_listing uuid, object_path text) returns uuid language plpgsql security definer set search_path = '' as $$
declare result uuid;
begin
  perform 1 from public.listings where id = target_listing for update;
  if not coalesce(private.owns_listing(target_listing, true), false) or not coalesce(private.can_manage_photo_path(object_path), false) or split_part(object_path, '/', 2) <> target_listing::text then raise exception 'Photo does not belong to an editable listing.'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'listing-photos' and name = object_path) then raise exception 'Upload the image before saving its record.'; end if;
  if (select count(*) from public.listing_photos where listing_id = target_listing) >= 12 then raise exception 'A listing can have up to 12 photos.'; end if;
  insert into public.listing_photos (listing_id, image_path, is_primary)
    values (target_listing, object_path, not exists (select 1 from public.listing_photos where listing_id = target_listing)) returning id into result;
  return result;
end;
$$;
create function public.set_primary_photo(target_photo uuid) returns void language plpgsql security definer set search_path = '' as $$
declare target_listing uuid;
begin
  select listing_id into target_listing from public.listing_photos where id = target_photo;
  perform 1 from public.listings where id = target_listing for update;
  if not coalesce(private.owns_listing(target_listing, true), false) then raise exception 'Only photos on your editable listings can be changed.'; end if;
  update public.listing_photos set is_primary = false where listing_id = target_listing and is_primary;
  update public.listing_photos set is_primary = true where id = target_photo and listing_id = target_listing;
  if not found then raise exception 'Photo no longer exists.'; end if;
end;
$$;
create function public.remove_listing_photo(target_photo uuid) returns text language plpgsql security definer set search_path = '' as $$
declare target_listing uuid; object_path text;
begin
  select listing_id into target_listing from public.listing_photos where id = target_photo;
  perform 1 from public.listings where id = target_listing for update;
  if not coalesce(private.owns_listing(target_listing, true), false) then raise exception 'Only photos on your editable listings can be removed.'; end if;
  delete from public.listing_photos where id = target_photo returning image_path into object_path;
  if not exists (select 1 from public.listing_photos where listing_id = target_listing and is_primary) then
    update public.listing_photos set is_primary = true where id = (select id from public.listing_photos where listing_id = target_listing order by created_at, id limit 1);
  end if;
  return object_path;
end;
$$;

revoke all on function private.can_manage_photo_path(text), private.can_read_photo_path(text) from public;
grant execute on function private.can_manage_photo_path(text), private.can_read_photo_path(text) to anon, authenticated;
revoke all on function public.save_boarding_house(uuid,jsonb,uuid[]), public.submit_listing(uuid), public.review_listing(uuid,text,text), public.set_account_status(uuid,text), public.add_listing_photo(uuid,text), public.set_primary_photo(uuid), public.remove_listing_photo(uuid) from public, anon;
grant execute on function public.save_boarding_house(uuid,jsonb,uuid[]), public.submit_listing(uuid), public.review_listing(uuid,text,text), public.set_account_status(uuid,text), public.add_listing_photo(uuid,text), public.set_primary_photo(uuid), public.remove_listing_photo(uuid) to authenticated;
