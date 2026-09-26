-- Run via npm run db:test after migrations + seed. Runner always rolls back.
create function pg_temp.assert_true(condition boolean, label text) returns void
language plpgsql as $$
begin
  if condition is distinct from true then raise exception 'Assertion failed: %', label; end if;
end;
$$;

do $$
begin
  execute format('grant usage on schema %I to anon, authenticated', pg_my_temp_schema()::regnamespace);
end;
$$;
create function pg_temp.expect_error(statement text, expected_state text) returns void
language plpgsql as $$
declare caught_state text;
begin
  begin
    execute statement;
  exception when others then
    get stacked diagnostics caught_state = returned_sqlstate;
  end;
  if caught_state is distinct from expected_state then
    raise exception 'Expected SQLSTATE %, received %', expected_state, coalesce(caught_state, 'success');
  end if;
end;
$$;

grant execute on function pg_temp.assert_true(boolean, text), pg_temp.expect_error(text, text) to anon, authenticated;

select pg_temp.assert_true((select count(*) = 6 from public.categories), 'six categories in clean seeded Dev');
select pg_temp.assert_true((select count(*) = 31 from public.subcategories), '31 subcategories');
select pg_temp.assert_true((select count(*) = 5 from public.states), 'five seed states');
select pg_temp.assert_true((select count(*) = 15 from public.products), '15 seed products');
select pg_temp.assert_true((select count(*) = 10 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relrowsecurity and c.relname in ('states','cities','areas','categories','subcategories','vendors','products','vendor_images','reviews','product_ratings')), 'RLS enabled on every application table');

select pg_temp.expect_error($q$insert into public.reviews(vendor_id,rating) values ('00000006-0000-4000-8000-000000000001',0)$q$, '23514');
select pg_temp.expect_error($q$insert into public.reviews(vendor_id,rating) values ('00000006-0000-4000-8000-000000000001',6)$q$, '23514');
select pg_temp.expect_error($q$update public.product_ratings set rating=6 where id='00000009-0000-4000-8000-000000000001'$q$, '23514');
select pg_temp.expect_error($q$update public.product_ratings set rating=0 where id='00000009-0000-4000-8000-000000000001'$q$, '23514');
select pg_temp.expect_error($q$update public.vendors set slug='aisyah-dessert' where slug='luna-hijab'$q$, '23505');
select pg_temp.expect_error($q$insert into public.product_ratings(review_id,product_id,vendor_id,rating) values ('00000008-0000-4000-8000-000000000002','00000007-0000-4000-8000-000000000001','00000006-0000-4000-8000-000000000001',5)$q$, '23505');
select pg_temp.expect_error($q$insert into public.product_ratings(review_id,product_id,vendor_id,rating) values ('00000008-0000-4000-8000-000000000002','00000007-0000-4000-8000-000000000004','00000006-0000-4000-8000-000000000001',5)$q$, '23503');
select pg_temp.expect_error($q$update public.vendors set state_id='00000003-0000-4000-8000-000000000002' where slug='aisyah-dessert'$q$, '23503');
select pg_temp.expect_error($q$update public.vendors set area_id='00000005-0000-4000-8000-000000000002' where slug='aisyah-dessert'$q$, '23503');
select pg_temp.expect_error($q$update public.vendors set subcategory_id='00000002-0000-4000-8000-000000000012' where slug='aisyah-dessert'$q$, '23503');
select pg_temp.expect_error($q$update public.vendors set latitude=91,longitude=100 where slug='aisyah-dessert'$q$, '23514');
select pg_temp.expect_error($q$update public.vendors set latitude=1,longitude=null where slug='aisyah-dessert'$q$, '23514');
select pg_temp.expect_error($q$update public.products set price=-1 where id='00000007-0000-4000-8000-000000000001'$q$, '23514');

-- Auth FK is exercised with existing managed identities; never insert fake auth users.
select pg_temp.expect_error($q$update public.reviews set customer_id='ffffffff-ffff-4fff-8fff-ffffffffffff' where id='00000008-0000-4000-8000-000000000001'$q$, '23503');

insert into public.vendor_images(id,vendor_id,storage_path,image_type,is_public) values
('00000010-0000-4000-8000-000000000001','00000006-0000-4000-8000-000000000001','test-only/public.webp','gallery',true),
('00000010-0000-4000-8000-000000000002','00000006-0000-4000-8000-000000000001','test-only/private.webp','gallery',false),
('00000010-0000-4000-8000-000000000003','00000006-0000-4000-8000-000000000006','test-only/draft.webp','gallery',true);
select pg_temp.expect_error($q$insert into public.vendor_images(vendor_id,product_id,storage_path,image_type) values ('00000006-0000-4000-8000-000000000001','00000007-0000-4000-8000-000000000004','test-only/cross.webp','product')$q$, '23503');

-- Non-owner role checks: identity columns and all writes must be inaccessible.
set local role anon;
select pg_temp.assert_true((select count(id)=5 from public.vendors), 'public vendor count');
select pg_temp.assert_true((select count(id)=0 from public.vendors where slug='draft-demo-stall'), 'draft vendor hidden');
select pg_temp.assert_true((select count(id)=4 from public.reviews), 'pending and draft-parent reviews hidden');
select pg_temp.assert_true((select count(*)=6 from public.product_ratings), 'pending-parent ratings hidden');
select pg_temp.assert_true((select count(*)=1 from public.vendor_images), 'private and draft-parent images hidden');
select pg_temp.assert_true((select average_rating=4.50 and review_count=2 and stars_4=1 and stars_5=1 from public.vendor_rating_summaries where vendor_id='00000006-0000-4000-8000-000000000001'), 'business aggregate excludes pending');
select pg_temp.assert_true((select average_rating=5 and rating_count=1 from public.product_rating_summaries where product_id='00000007-0000-4000-8000-000000000001'), 'product aggregate excludes pending');
select pg_temp.assert_true((select average_rating is null and review_count=0 from public.vendor_rating_summaries where vendor_id='00000006-0000-4000-8000-000000000004'), 'unreviewed vendor has null average');
select pg_temp.expect_error('select customer_id from public.reviews', '42501');
select pg_temp.expect_error('select owner_user_id from public.vendors', '42501');
select pg_temp.expect_error($q$insert into public.reviews(vendor_id,rating) values ('00000006-0000-4000-8000-000000000001',5)$q$, '42501');
select pg_temp.expect_error($q$update public.vendors set status='published' where slug='draft-demo-stall'$q$, '42501');
select pg_temp.expect_error('delete from public.products', '42501');
reset role;
set local role authenticated;
select pg_temp.assert_true((select count(id)=5 from public.vendors), 'authenticated role has same read boundary');
select pg_temp.expect_error('update public.reviews set verification_status=''verified''', '42501');
select pg_temp.expect_error('select customer_id from public.reviews', '42501');
reset role;

-- Parent deactivation propagates through child policies and invoker views.
update public.vendors set is_active=false where slug='aisyah-dessert';
set local role anon;
select pg_temp.assert_true((select count(*)=0 from public.products where vendor_id='00000006-0000-4000-8000-000000000001'), 'inactive vendor products hidden');
select pg_temp.assert_true((select count(id)=0 from public.reviews where vendor_id='00000006-0000-4000-8000-000000000001'), 'inactive vendor reviews hidden');
select pg_temp.assert_true((select count(*)=0 from public.product_ratings where vendor_id='00000006-0000-4000-8000-000000000001'), 'inactive vendor product ratings hidden');
select pg_temp.assert_true((select count(*)=0 from public.vendor_rating_summaries where vendor_id='00000006-0000-4000-8000-000000000001'), 'inactive vendor summary hidden');
reset role;
delete from public.reviews where id='00000008-0000-4000-8000-000000000002';
select pg_temp.assert_true((select count(*)=0 from public.product_ratings where review_id='00000008-0000-4000-8000-000000000002'), 'review deletion cascades child ratings');
