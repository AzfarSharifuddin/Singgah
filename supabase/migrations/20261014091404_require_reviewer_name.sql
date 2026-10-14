-- Keep historical reviews unchanged. Every new customer submission must carry a
-- public name containing letters and spaces only.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reviews'::regclass
      and conname = 'reviews_reviewer_name_format'
  ) then
    alter table public.reviews
      add constraint reviews_reviewer_name_format check (
        reviewer_name is null or (
          char_length(reviewer_name) between 2 and 80
          and reviewer_name ~ '^[[:alpha:]]+( [[:alpha:]]+)*$'
        )
      ) not valid;
  end if;
end;
$$;

alter table public.reviews validate constraint reviews_reviewer_name_format;

create or replace function public.submit_customer_review(p_payload text, p_signature text) returns uuid
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
  reviewer text;
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
  if jsonb_typeof(data) <> 'object' or data - array['customerId','vendorId','name','rating','text','products','expires','termsAccepted','termsVersion'] <> '{}'::jsonb
     or not (data ?& array['customerId','vendorId','name','rating','text','products','expires','termsAccepted','termsVersion']) then
    raise exception 'invalid_review';
  end if;
  if (data->>'customerId')::uuid is distinct from customer then raise exception 'invalid_identity' using errcode = '42501'; end if;
  if jsonb_typeof(data->'expires') <> 'number' then raise exception 'invalid_permit' using errcode = '42501'; end if;
  expires_at := (data->>'expires')::bigint;
  if expires_at < extract(epoch from clock_timestamp()) or expires_at > extract(epoch from clock_timestamp()) + 180 then
    raise exception 'expired_permit' using errcode = '42501';
  end if;
  if jsonb_typeof(data->'name') <> 'string' then raise exception 'invalid_reviewer_name'; end if;
  reviewer := btrim(data->>'name');
  if char_length(reviewer) not between 2 and 80 or reviewer !~ '^[[:alpha:]]+( [[:alpha:]]+)*$' then
    raise exception 'invalid_reviewer_name';
  end if;
  if jsonb_typeof(data->'rating') <> 'number' or (data->>'rating') !~ '^[1-5]$' then raise exception 'invalid_rating'; end if;
  if jsonb_typeof(data->'text') not in ('string','null') then raise exception 'invalid_review'; end if;
  message_text := nullif(btrim(data->>'text'), '');
  if char_length(message_text) > 1000 then raise exception 'review_too_long'; end if;
  if jsonb_typeof(data->'products') <> 'array' then raise exception 'invalid_products'; end if;
  if jsonb_array_length(data->'products') > 30 then raise exception 'too_many_products'; end if;
  if data->'termsAccepted' is distinct from 'true'::jsonb or data->>'termsVersion' is distinct from '2026-09-27' then
    raise exception 'terms_acceptance_required';
  end if;
  target_vendor := (data->>'vendorId')::uuid;
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
  insert into public.reviews(vendor_id, customer_id, rating, review_text, reviewer_name, status, verification_status, terms_version, terms_accepted_at)
    values(target_vendor, customer, (data->>'rating')::smallint, message_text, reviewer,
      case when config.publish_immediately then 'published' else 'pending' end, 'unverified', '2026-09-27', clock_timestamp())
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
comment on function public.submit_customer_review(text, text) is 'Atomic, named, auth.uid-bound review write requiring a short-lived server HMAC permit after CAPTCHA validation.';
