-- Registered, confirmed accounts are eligible to own one business. Editable
-- user_metadata is never an authority. Ownership is the vendor role for MVP.
create unique index vendors_one_owner on public.vendors(owner_user_id) where owner_user_id is not null;

create function private.vendor_account() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from auth.users where id=auth.uid() and not is_anonymous and email_confirmed_at is not null);
$$;
create function private.owns_vendor(target uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select private.vendor_account() and exists(select 1 from public.vendors where id=target and owner_user_id=auth.uid());
$$;
revoke all on function private.vendor_account(), private.owns_vendor(uuid) from public, anon, authenticated;
grant execute on function private.vendor_account(), private.owns_vendor(uuid) to authenticated;

create function public.current_vendor_id() returns uuid language sql stable security definer set search_path = '' as $$
  select id from public.vendors where owner_user_id=auth.uid() and private.vendor_account();
$$;
revoke all on function public.current_vendor_id() from public, anon;
grant execute on function public.current_vendor_id() to authenticated;

create policy vendor_read on public.vendors for select to authenticated using (private.owns_vendor(id));
create policy vendor_update on public.vendors for update to authenticated using (private.owns_vendor(id)) with check (private.owns_vendor(id));
grant update(name,description,category_id,subcategory_id,state_id,city_id,area_id,address,phone,whatsapp,website_url,instagram_url,tiktok_url,facebook_url) on public.vendors to authenticated;

create function public.create_vendor_business(p_profile jsonb) returns uuid language plpgsql security definer set search_path = '' as $$
declare v public.vendors; result uuid; base_slug text; chosen_slug text;
begin
  if not private.vendor_account() then raise exception 'confirmed_vendor_account_required' using errcode='42501'; end if;
  if p_profile is null or jsonb_typeof(p_profile)<>'object' or p_profile - array['name','description','category_id','subcategory_id','state_id','city_id','area_id','address','phone','whatsapp','website_url','instagram_url','tiktok_url','facebook_url'] <> '{}'::jsonb then raise exception 'invalid_profile'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 519));
  if exists(select 1 from public.vendors where owner_user_id=auth.uid()) then raise exception 'business_already_exists' using errcode='23505'; end if;
  v := jsonb_populate_record(null::public.vendors,p_profile);
  v.name := btrim(v.name);
  base_slug := trim(both '-' from regexp_replace(lower(v.name),'[^a-z0-9]+','-','g'));
  if base_slug='' or base_slug is null then base_slug:='local-business'; end if;
  if base_slug in ('login','register','logout','dashboard') then base_slug:=base_slug||'-business'; end if;
  perform pg_advisory_xact_lock(hashtextextended(base_slug, 520));
  chosen_slug:=base_slug;
  if exists(select 1 from public.vendors where slug=chosen_slug) then chosen_slug:=left(base_slug,140)||'-'||gen_random_uuid()::text; end if;
  insert into public.vendors(owner_user_id,name,slug,description,category_id,subcategory_id,state_id,city_id,area_id,address,phone,whatsapp,website_url,instagram_url,tiktok_url,facebook_url,status)
  values(auth.uid(),v.name,chosen_slug,v.description,v.category_id,v.subcategory_id,v.state_id,v.city_id,v.area_id,v.address,v.phone,v.whatsapp,v.website_url,v.instagram_url,v.tiktok_url,v.facebook_url,'pending') returning id into result;
  return result;
end;
$$;
revoke all on function public.create_vendor_business(jsonb) from public, anon;
grant execute on function public.create_vendor_business(jsonb) to authenticated;

create policy vendor_read on public.products for select to authenticated using (private.owns_vendor(vendor_id));
create policy vendor_insert on public.products for insert to authenticated with check (private.owns_vendor(vendor_id));
create policy vendor_update on public.products for update to authenticated using (private.owns_vendor(vendor_id)) with check (private.owns_vendor(vendor_id));
grant insert(vendor_id,name,description,price,is_active), update(name,description,price,is_active) on public.products to authenticated;
create policy vendor_read on public.vendor_images for select to authenticated using (private.owns_vendor(vendor_id));

-- Private media preserves pending/suspended vendor visibility rules. Public
-- signed reads are authorized only for referenced, public media of public vendors.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('vendor-media','vendor-media',false,3145728,array['image/jpeg','image/png','image/webp']);

create function private.owns_media_path(object_name text) returns boolean language plpgsql stable security definer set search_path='' as $$
declare parts text[] := string_to_array(object_name,'/'); target uuid;
begin
  if object_name !~ '^vendors/[0-9a-f-]{36}/(logo|cover|gallery)/[0-9a-f-]{36}\.webp$'
    and object_name !~ '^vendors/[0-9a-f-]{36}/products/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' then return false; end if;
  target:=parts[2]::uuid;
  if not private.owns_vendor(target) then return false; end if;
  if parts[3]='products' then return exists(select 1 from public.products where id=parts[4]::uuid and vendor_id=target); end if;
  return true;
exception when invalid_text_representation then return false;
end;
$$;
create function private.public_media_path(object_name text) returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.vendor_images i join public.vendors v on v.id=i.vendor_id
    where i.storage_path=object_name and i.is_public and v.status='published' and v.is_active
    and (i.product_id is null or exists(select 1 from public.products p where p.id=i.product_id and p.is_active)));
$$;
revoke all on function private.owns_media_path(text), private.public_media_path(text) from public, anon, authenticated;
grant execute on function private.owns_media_path(text) to authenticated;
grant execute on function private.public_media_path(text) to anon, authenticated;
create policy vendor_media_read_public on storage.objects for select to anon, authenticated using(bucket_id='vendor-media' and private.public_media_path(name));
create policy vendor_media_read_owner on storage.objects for select to authenticated using(bucket_id='vendor-media' and private.owns_media_path(name));
create policy vendor_media_insert on storage.objects for insert to authenticated with check(bucket_id='vendor-media' and private.owns_media_path(name));
-- Immutable UUID object names: replacement uploads a new object, never overwrites.
create policy vendor_media_delete on storage.objects for delete to authenticated using(bucket_id='vendor-media' and private.owns_media_path(name));

create function public.attach_vendor_image(p_path text,p_kind text,p_product uuid default null,p_alt text default null) returns text
language plpgsql security definer set search_path='' as $$
declare target uuid:=public.current_vendor_id(); old_path text; image_id uuid;
begin
  if target is null or not private.owns_media_path(p_path) then raise exception 'media_access_denied' using errcode='42501'; end if;
  perform id from public.vendors where id=target for update;
  if p_kind not in ('logo','cover','gallery','product') or p_kind is null then raise exception 'invalid_media_kind'; end if;
  if p_kind='product' then
    if p_product is null or not exists(select 1 from public.products where id=p_product and vendor_id=target) or split_part(p_path,'/',3)<>'products' or split_part(p_path,'/',4)<>p_product::text then raise exception 'invalid_product'; end if;
  elsif p_product is not null or split_part(p_path,'/',3)<>p_kind then raise exception 'invalid_media_path'; end if;
  if not exists(select 1 from storage.objects where bucket_id='vendor-media' and name=p_path) then raise exception 'missing_storage_object'; end if;
  if p_kind='gallery' then
    if (select count(*) from public.vendor_images where vendor_id=target and image_type='gallery')>=8 then raise exception 'gallery_limit'; end if;
  else
    select id,storage_path into image_id,old_path from public.vendor_images where vendor_id=target and image_type=p_kind and (p_kind<>'product' or product_id=p_product);
  end if;
  if image_id is not null then
    update public.vendor_images set storage_path=p_path,alt_text=p_alt,is_public=true where id=image_id;
  else
    insert into public.vendor_images(vendor_id,product_id,storage_path,image_type,alt_text,is_public)
      values(target,p_product,p_path,p_kind,p_alt,true);
  end if;
  return old_path;
end;
$$;
create function public.detach_vendor_image(p_image uuid) returns text language plpgsql security definer set search_path='' as $$
declare result text; target uuid:=public.current_vendor_id();
begin
  if target is null then raise exception 'media_access_denied' using errcode='42501'; end if;
  perform id from public.vendors where id=target for update;
  delete from public.vendor_images where id=p_image and vendor_id=target returning storage_path into result;
  if result is null then raise exception 'media_access_denied' using errcode='42501'; end if;
  return result;
end;
$$;
revoke all on function public.attach_vendor_image(text,text,uuid,text), public.detach_vendor_image(uuid) from public, anon;
grant execute on function public.attach_vendor_image(text,text,uuid,text), public.detach_vendor_image(uuid) to authenticated;
