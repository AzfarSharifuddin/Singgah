-- Admin membership can only be provisioned through trusted database tooling.
create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table private.vendor_moderation_log (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  previous_status text not null,
  decision text not null check (decision in ('approve', 'reject')),
  reason text check (length(reason) <= 1000),
  created_at timestamptz not null default now()
);
revoke all on private.admin_users, private.vendor_moderation_log from public, anon, authenticated;
create index vendor_moderation_log_vendor on private.vendor_moderation_log(vendor_id, created_at desc);

create function public.is_singgah_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.admin_users a join auth.users u on u.id = a.user_id
    where a.user_id = auth.uid() and not u.is_anonymous and u.email_confirmed_at is not null
  );
$$;

create function public.admin_vendor_list(p_status text default 'pending', p_search text default '', p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb; total integer; pages integer; current_page integer;
begin
  if not public.is_singgah_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_status is null or p_status not in ('all','draft','pending','published','suspended','archived')
    or p_search is null or length(p_search) > 100 or p_page is null or p_page < 1 then
    raise exception 'invalid_filter' using errcode = '22023';
  end if;
  select count(*) into total from public.vendors v
    where (p_status = 'all' or v.status = p_status) and strpos(lower(v.name), lower(btrim(p_search))) > 0;
  pages := greatest(1, (total + 19) / 20);
  current_page := least(p_page, pages);
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id), '[]'::jsonb) into result
  from (
    select v.id, v.name, v.slug, v.description, v.status, v.is_active, v.created_at,
      c.name as category, s.name as state, city.name as city,
      (select l.reason from private.vendor_moderation_log l where l.vendor_id = v.id
        order by l.created_at desc, l.id desc limit 1) as last_reason
    from public.vendors v join public.categories c on c.id = v.category_id
      join public.states s on s.id = v.state_id join public.cities city on city.id = v.city_id
    where (p_status = 'all' or v.status = p_status) and strpos(lower(v.name), lower(btrim(p_search))) > 0
    order by v.created_at desc, v.id limit 20 offset (current_page - 1) * 20
  ) r;
  return jsonb_build_object('vendors', result, 'total', total, 'page', current_page, 'pages', pages);
end;
$$;

create function public.admin_moderate_vendor(p_id uuid, p_decision text, p_expected_status text, p_reason text default '')
returns void language plpgsql security definer set search_path = '' as $$
declare previous text; explanation text := btrim(p_reason);
begin
  if not public.is_singgah_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_decision is null or p_decision not in ('approve','reject') or explanation is null
    or length(explanation) > 1000 or (p_decision = 'reject' and length(explanation) < 3) then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;
  select status into previous from public.vendors where id = p_id for update;
  if previous is null then raise exception 'vendor_not_found' using errcode = '22023'; end if;
  if p_expected_status is null or previous <> p_expected_status then
    raise exception 'vendor_changed_refresh' using errcode = '40001';
  end if;
  if previous not in ('pending','published','suspended') then
    raise exception 'vendor_not_reviewable' using errcode = '22023';
  end if;
  if (p_decision = 'approve' and previous = 'published') or (p_decision = 'reject' and previous = 'suspended') then
    raise exception 'decision_already_applied' using errcode = '22023';
  end if;
  update public.vendors set status = case when p_decision = 'approve' then 'published' else 'suspended' end
    where id = p_id;
  insert into private.vendor_moderation_log(vendor_id,actor_id,previous_status,decision,reason)
    values(p_id,auth.uid(),previous,p_decision,nullif(explanation,''));
end;
$$;
revoke all on function public.is_singgah_admin(), public.admin_vendor_list(text,text,integer),
  public.admin_moderate_vendor(uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.is_singgah_admin(), public.admin_vendor_list(text,text,integer),
  public.admin_moderate_vendor(uuid,text,text,text) to authenticated;
