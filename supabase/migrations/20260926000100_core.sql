-- Core catalog. Managed auth.users is supplied by hosted Supabase.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.states (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country_code text not null default 'MY' check (country_code = 'MY'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.states(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  kind text not null default 'city' check (kind in ('city', 'district')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state_id, slug),
  unique (id, state_id)
);

create table public.areas (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, slug),
  unique (id, city_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 100),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category_id, slug),
  unique (id, category_id)
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references auth.users(id) on delete set null,
  name text not null check (length(btrim(name)) between 1 and 160),
  slug text not null unique check (length(slug) <= 180 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text check (length(description) <= 5000),
  category_id uuid not null references public.categories(id) on delete restrict,
  subcategory_id uuid,
  state_id uuid not null references public.states(id) on delete restrict,
  city_id uuid not null,
  area_id uuid,
  address text check (length(address) <= 1000),
  latitude numeric(9,6),
  longitude numeric(9,6),
  location_notes text check (length(location_notes) <= 1000),
  phone text check (length(phone) <= 32),
  whatsapp text check (length(whatsapp) <= 32),
  website_url text check (website_url ~ '^https?://[^[:space:]]+$'),
  instagram_url text check (instagram_url ~ '^https?://[^[:space:]]+$'),
  tiktok_url text check (tiktok_url ~ '^https?://[^[:space:]]+$'),
  facebook_url text check (facebook_url ~ '^https?://[^[:space:]]+$'),
  status text not null default 'draft' check (status in ('draft', 'pending', 'published', 'suspended', 'archived')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (subcategory_id, category_id) references public.subcategories(id, category_id) on delete restrict,
  foreign key (city_id, state_id) references public.cities(id, state_id) on delete restrict,
  foreign key (area_id, city_id) references public.areas(id, city_id) on delete restrict,
  check ((latitude is null and longitude is null) or
    (latitude is not null and longitude is not null and latitude between -90 and 90 and longitude between -180 and 180))
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  name text not null check (length(btrim(name)) between 1 and 160),
  description text check (length(description) <= 3000),
  price numeric(12,2) check (price >= 0 and price <> 'NaN'::numeric),
  currency_code text not null default 'MYR' check (currency_code = 'MYR'),
  is_active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, vendor_id)
);

-- One media model; paths are relative to the future vendor-media bucket.
create table public.vendor_images (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  product_id uuid,
  storage_path text not null unique check (length(storage_path) between 1 and 1024 and storage_path !~ '(^/|://|\.\.)'),
  image_type text not null check (image_type in ('logo', 'cover', 'gallery', 'product')),
  alt_text text check (length(alt_text) <= 500),
  display_order integer not null default 0 check (display_order >= 0),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (product_id, vendor_id) references public.products(id, vendor_id) on delete restrict,
  check ((image_type = 'product' and product_id is not null) or (image_type <> 'product' and product_id is null))
);
create unique index vendor_images_identity_unique on public.vendor_images(vendor_id, image_type) where image_type in ('logo', 'cover');
create unique index vendor_images_product_unique on public.vendor_images(product_id) where image_type = 'product';

-- Explicit filter/FK indexes; no speculative text or spatial indexes yet.
create index vendors_owner_idx on public.vendors(owner_user_id);
create index vendors_category_idx on public.vendors(category_id);
create index vendors_subcategory_idx on public.vendors(subcategory_id, category_id);
create index vendors_state_city_idx on public.vendors(state_id, city_id);
create index vendors_city_idx on public.vendors(city_id, state_id);
create index vendors_area_idx on public.vendors(area_id, city_id);
create index products_vendor_idx on public.products(vendor_id, is_active, display_order);
create index vendor_images_vendor_idx on public.vendor_images(vendor_id, image_type, display_order);
create index vendor_images_product_idx on public.vendor_images(product_id, vendor_id);

do $$
declare table_name text;
begin
  foreach table_name in array array['states', 'cities', 'areas', 'categories', 'subcategories', 'vendors', 'products', 'vendor_images'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name);
  end loop;
end;
$$;
