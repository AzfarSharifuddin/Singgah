-- Private evidence images are separate from the public business gallery.
create table public.vendor_verification_images (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  storage_path text not null unique
    check (storage_path ~ '^vendors/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$'),
  evidence_type text not null check (evidence_type in ('storefront', 'signage', 'products', 'workspace', 'other')),
  created_at timestamptz not null default now()
);
create index vendor_verification_images_vendor_idx
  on public.vendor_verification_images(vendor_id, created_at, id);

alter table public.vendor_verification_images enable row level security;
revoke all on public.vendor_verification_images from public, anon, authenticated;
grant select on public.vendor_verification_images to authenticated;
create policy vendor_verification_images_read on public.vendor_verification_images
  for select to authenticated
  using (private.owns_vendor(vendor_id) or public.is_singgah_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('vendor-verification', 'vendor-verification', false, 3145728, array['image/webp']);

create function private.owns_verification_path(object_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare parts text[] := string_to_array(object_name, '/'); target uuid;
begin
  if object_name !~ '^vendors/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' then return false; end if;
  target := parts[2]::uuid;
  return private.owns_vendor(target);
exception when invalid_text_representation then return false;
end;
$$;
revoke all on function private.owns_verification_path(text) from public, anon, authenticated;
grant execute on function private.owns_verification_path(text) to authenticated;

create policy vendor_verification_read on storage.objects for select to authenticated
  using (bucket_id = 'vendor-verification' and
    (private.owns_verification_path(name) or public.is_singgah_admin()));
create policy vendor_verification_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'vendor-verification' and private.owns_verification_path(name));
create policy vendor_verification_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vendor-verification' and private.owns_verification_path(name));

create function public.attach_vendor_verification_image(p_path text, p_type text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target uuid := public.current_vendor_id(); result uuid;
begin
  if target is null or p_type is null or p_type not in ('storefront', 'signage', 'products', 'workspace', 'other')
    or p_path !~ ('^vendors/' || target::text || '/[0-9a-f-]{36}\.webp$')
    or not private.owns_verification_path(p_path)
    or not exists (select 1 from storage.objects where bucket_id = 'vendor-verification' and name = p_path) then
    raise exception 'verification_image_access_denied' using errcode = '42501';
  end if;
  perform id from public.vendors where id = target for update;
  if (select count(*) from public.vendor_verification_images where vendor_id = target) >= 5 then
    raise exception 'verification_image_limit';
  end if;
  insert into public.vendor_verification_images(vendor_id, storage_path, evidence_type)
    values(target, p_path, p_type) returning id into result;
  return result;
end;
$$;

create function public.detach_vendor_verification_image(p_image uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare target uuid := public.current_vendor_id(); result text;
begin
  if target is null then raise exception 'verification_image_access_denied' using errcode = '42501'; end if;
  perform id from public.vendors where id = target for update;
  delete from public.vendor_verification_images where id = p_image and vendor_id = target
    returning storage_path into result;
  if result is null then raise exception 'verification_image_access_denied' using errcode = '42501'; end if;
  return result;
end;
$$;
revoke all on function public.attach_vendor_verification_image(text, text),
  public.detach_vendor_verification_image(uuid) from public, anon;
grant execute on function public.attach_vendor_verification_image(text, text),
  public.detach_vendor_verification_image(uuid) to authenticated;
