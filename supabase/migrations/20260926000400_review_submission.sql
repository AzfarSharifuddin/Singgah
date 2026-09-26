-- A server permit makes CAPTCHA enforceable even against direct RPC callers.
-- The browser never receives the signing key or gains table write privileges.
create extension if not exists pgcrypto with schema extensions;
create table private.review_submission_config (
  singleton boolean primary key default true check (singleton),
  signing_secret text not null default encode(extensions.gen_random_bytes(32), 'hex'),
  publish_immediately boolean not null default true
);
alter table private.review_submission_config enable row level security;
revoke all on private.review_submission_config from public, anon, authenticated;
insert into private.review_submission_config(singleton) values (true);

alter table public.reviews add constraint reviews_text_mvp_length check (char_length(review_text) <= 1000) not valid;
alter table public.reviews validate constraint reviews_text_mvp_length;

create function public.has_reviewed_vendor(p_vendor_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.reviews where vendor_id = p_vendor_id and customer_id = auth.uid()
  );
$$;
revoke all on function public.has_reviewed_vendor(uuid) from public, anon;
grant execute on function public.has_reviewed_vendor(uuid) to authenticated;

create function public.submit_customer_review(p_payload text, p_signature text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  customer uuid := auth.uid();
  config private.review_submission_config%rowtype;
  data jsonb;
  item jsonb;
  target_vendor uuid;
  target_product uuid;
  new_review uuid;
  owner_id uuid;
  message_text text;
  expires_at bigint;
  seen uuid[] := '{}';
begin
  if customer is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_payload is null or octet_length(p_payload) > 16384 or p_signature is null then
    raise exception 'invalid_permit' using errcode = '42501';
  end if;
  select * into strict config from private.review_submission_config where singleton;
  if p_signature !~ '^[a-f0-9]{64}$' or p_signature <> encode(extensions.hmac(p_payload, config.signing_secret, 'sha256'), 'hex') then
    raise exception 'invalid_permit' using errcode = '42501';
  end if;
  data := p_payload::jsonb;
  if jsonb_typeof(data) <> 'object' or data - array['customerId','vendorId','rating','text','products','expires'] <> '{}'::jsonb
     or not (data ?& array['customerId','vendorId','rating','text','products','expires']) then
    raise exception 'invalid_review';
  end if;
  if (data->>'customerId')::uuid is distinct from customer then raise exception 'invalid_identity' using errcode = '42501'; end if;
  if jsonb_typeof(data->'expires') <> 'number' then raise exception 'invalid_permit' using errcode = '42501'; end if;
  expires_at := (data->>'expires')::bigint;
  if expires_at < extract(epoch from clock_timestamp()) or expires_at > extract(epoch from clock_timestamp()) + 180 then
    raise exception 'expired_permit' using errcode = '42501';
  end if;
  if jsonb_typeof(data->'rating') <> 'number' or (data->>'rating') !~ '^[1-5]$' then raise exception 'invalid_rating'; end if;
  if jsonb_typeof(data->'text') not in ('string','null') then raise exception 'invalid_review'; end if;
  message_text := nullif(btrim(data->>'text'), '');
  if char_length(message_text) > 1000 then raise exception 'review_too_long'; end if;
  if jsonb_typeof(data->'products') <> 'array' then raise exception 'invalid_products'; end if;
  if jsonb_array_length(data->'products') > 30 then raise exception 'too_many_products'; end if;
  target_vendor := (data->>'vendorId')::uuid;
  -- Serialize writes for this identity: duplicate/rate-limit checks cannot race.
  perform pg_advisory_xact_lock(hashtextextended(customer::text, 417));
  select owner_user_id into owner_id from public.vendors
    where id = target_vendor and status = 'published' and is_active for share;
  if not found then raise exception 'vendor_unavailable'; end if;
  if owner_id = customer then raise exception 'self_review_not_allowed'; end if;
  if exists (select 1 from public.reviews where vendor_id = target_vendor and customer_id = customer) then
    raise exception 'already_reviewed' using errcode = '23505';
  end if;
  if (select count(*) from public.reviews where customer_id = customer and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'review_rate_limited';
  end if;
  insert into public.reviews(vendor_id, customer_id, rating, review_text, status, verification_status)
    values(target_vendor, customer, (data->>'rating')::smallint, message_text,
      case when config.publish_immediately then 'published' else 'pending' end, 'unverified')
    returning id into new_review;
  for item in select value from jsonb_array_elements(data->'products') loop
    if jsonb_typeof(item) <> 'object' or item - array['productId','rating'] <> '{}'::jsonb
       or not (item ?& array['productId','rating']) or jsonb_typeof(item->'rating') <> 'number'
       or (item->>'rating') !~ '^[1-5]$' then raise exception 'invalid_product_rating'; end if;
    target_product := (item->>'productId')::uuid;
    if target_product = any(seen) then raise exception 'duplicate_product_rating' using errcode = '23505'; end if;
    perform id from public.products where id = target_product and vendor_id = target_vendor and is_active for share;
    if not found then raise exception 'invalid_product'; end if;
    seen := array_append(seen, target_product);
    insert into public.product_ratings(review_id, product_id, vendor_id, rating)
      values(new_review, target_product, target_vendor, (item->>'rating')::smallint);
  end loop;
  return new_review;
end;
$$;
revoke all on function public.submit_customer_review(text, text) from public, anon;
grant execute on function public.submit_customer_review(text, text) to authenticated;
-- No INSERT/UPDATE/DELETE grants or permissive write policies are added.
comment on function public.submit_customer_review(text, text) is 'Atomic, auth.uid-bound review write requiring a short-lived server HMAC permit after CAPTCHA validation.';
