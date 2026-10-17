-- Recover only fresh, unused product rows left by failed image uploads.
-- No general DELETE grant or owner DELETE policy is introduced.
create function public.discard_unfinished_product(p_product uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare target uuid := public.current_vendor_id(); item public.products%rowtype;
begin
  if target is null then raise exception 'confirmed_vendor_account_required' using errcode = '42501'; end if;
  -- Same lock order as media attachment: vendor, then product.
  perform id from public.vendors where id = target for update;
  select * into item from public.products where id = p_product and vendor_id = target for update;
  if not found then return false; end if;
  if item.is_active or item.created_at < statement_timestamp() - interval '15 minutes' then return false; end if;
  if exists (select 1 from public.vendor_images where product_id = item.id)
    or exists (select 1 from public.product_ratings where product_id = item.id)
    or exists (select 1 from storage.objects where bucket_id = 'vendor-media'
      and starts_with(name, 'vendors/' || target::text || '/products/' || item.id::text || '/')) then
    return false;
  end if;
  delete from public.products where id = item.id and vendor_id = target;
  return true;
end;
$$;
revoke all on function public.discard_unfinished_product(uuid) from public, anon, authenticated;
grant execute on function public.discard_unfinished_product(uuid) to authenticated;
comment on function public.discard_unfinished_product(uuid) is 'Owner-only cleanup of an inactive product created within 15 minutes with no images, ratings or Storage objects.';
