-- No client writes in Sprint 1. Applies equally to anon and authenticated users.
do $$
declare table_name text;
begin
  foreach table_name in array array['states', 'cities', 'areas', 'categories', 'subcategories', 'vendors', 'products', 'vendor_images', 'reviews', 'product_ratings'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from public, anon, authenticated', table_name);
  end loop;
end;
$$;
grant usage on schema public to anon, authenticated;
grant select on public.states, public.cities, public.areas, public.categories, public.subcategories,
  public.products, public.vendor_images, public.product_ratings to anon, authenticated;
-- RLS does not hide columns. Identity columns are not part of the public API.
grant select (id, name, slug, description, category_id, subcategory_id, state_id, city_id, area_id,
  address, latitude, longitude, location_notes, phone, whatsapp, website_url, instagram_url,
  tiktok_url, facebook_url, status, is_active, created_at, updated_at)
  on public.vendors to anon, authenticated;
grant select (id, vendor_id, rating, review_text, reviewer_name, status, verification_status, created_at, updated_at)
  on public.reviews to anon, authenticated;

create policy public_read on public.states for select to anon, authenticated using (true);
create policy public_read on public.cities for select to anon, authenticated using (true);
create policy public_read on public.areas for select to anon, authenticated using (true);
create policy public_read on public.categories for select to anon, authenticated using (true);
create policy public_read on public.subcategories for select to anon, authenticated using (true);
create policy public_read on public.vendors for select to anon, authenticated using (status = 'published' and is_active);
create policy public_read on public.products for select to anon, authenticated using (
  is_active and exists (select 1 from public.vendors v where v.id = vendor_id and v.status = 'published' and v.is_active)
);
create policy public_read on public.vendor_images for select to anon, authenticated using (
  is_public and exists (select 1 from public.vendors v where v.id = vendor_id and v.status = 'published' and v.is_active)
  and (product_id is null or exists (select 1 from public.products p where p.id = product_id and p.is_active))
);
create policy public_read on public.reviews for select to anon, authenticated using (
  status = 'published' and exists (select 1 from public.vendors v where v.id = vendor_id and v.status = 'published' and v.is_active)
);
create policy public_read on public.product_ratings for select to anon, authenticated using (
  exists (select 1 from public.reviews r where r.id = review_id and r.status = 'published')
  and exists (select 1 from public.products p where p.id = product_id and p.is_active)
);

create view public.vendor_rating_summaries with (security_invoker = true) as
select v.id as vendor_id, count(r.id) as review_count, avg(r.rating)::numeric(3,2) as average_rating,
  count(r.id) filter (where r.rating = 1) as stars_1,
  count(r.id) filter (where r.rating = 2) as stars_2,
  count(r.id) filter (where r.rating = 3) as stars_3,
  count(r.id) filter (where r.rating = 4) as stars_4,
  count(r.id) filter (where r.rating = 5) as stars_5
from public.vendors v left join public.reviews r on r.vendor_id = v.id and r.status = 'published'
where v.status = 'published' and v.is_active group by v.id;

create view public.product_rating_summaries with (security_invoker = true) as
select p.id as product_id, count(pr.id) as rating_count, avg(pr.rating)::numeric(3,2) as average_rating
from public.products p
join public.vendors v on v.id = p.vendor_id and v.status = 'published' and v.is_active
left join (public.product_ratings pr join public.reviews r on r.id = pr.review_id and r.status = 'published')
  on pr.product_id = p.id
where p.is_active group by p.id;
revoke all on public.vendor_rating_summaries, public.product_rating_summaries from public, anon, authenticated;
grant select on public.vendor_rating_summaries, public.product_rating_summaries to anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;
