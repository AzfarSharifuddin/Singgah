create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  customer_id uuid references auth.users(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  review_text text check (length(review_text) <= 2000),
  reviewer_name text check (length(btrim(reviewer_name)) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected', 'flagged')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, vendor_id)
);
create unique index reviews_customer_vendor_unique on public.reviews(vendor_id, customer_id) where customer_id is not null;
create index reviews_vendor_status_idx on public.reviews(vendor_id, status, created_at desc, id);
create index reviews_customer_idx on public.reviews(customer_id);
create trigger set_updated_at before update on public.reviews for each row execute function private.set_updated_at();

create table public.product_ratings (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  product_id uuid not null,
  -- Deliberate redundancy: composite FKs prevent rating another vendor's product.
  vendor_id uuid not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (review_id, product_id),
  foreign key (review_id, vendor_id) references public.reviews(id, vendor_id) on delete cascade,
  foreign key (product_id, vendor_id) references public.products(id, vendor_id) on delete restrict
);
create index product_ratings_product_idx on public.product_ratings(product_id, vendor_id);
create index product_ratings_review_idx on public.product_ratings(review_id, vendor_id);
create trigger set_updated_at before update on public.product_ratings for each row execute function private.set_updated_at();

comment on column public.reviews.customer_id is 'Future Supabase identity; nullable for fixtures and deliberate account anonymization. Future submission must derive this from auth.uid().';
comment on column public.reviews.verification_status is 'Server-controlled evidence status; unverified is the only value used by Sprint 1. No verification workflow yet.';
