# Sprint 1 database decisions

## Scope and validation status

The Sprint 0 UI is unchanged. On 2026-09-26, all three migrations and development
fixtures were applied to hosted Singgah Dev. `db:test` passed the hosted integrity,
RLS, column-privilege and aggregate assertions and rolled back its test writes.
`supabase:check` passed public-client reads of vendor, category/location, products,
reviews, product ratings and summaries. This verification does not cover future
authentication or mutation flows, which remain out of scope.

### TLS certificate

Database scripts use the public CA at `supabase/certs/prod-ca-2021.crt` with
`rejectUnauthorized: true`; hostname validation remains enabled. The certificate
was downloaded from the URL configured in [Supabase's official dashboard source](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json):
`https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.
Its SHA-256 fingerprint is
`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`,
and its expiry is 2031-04-26. It is safe to track this public CA certificate.
The database password remains solely in ignored local configuration.

## Relationships

```text
auth.users --< vendors.owner_user_id (nullable)
auth.users --< reviews.customer_id (nullable)
states --< cities --< areas
categories --< subcategories
vendors >-- category + optional subcategory
vendors >-- state + city + optional area
vendors --< products
vendors --< vendor_images >-- optional product
vendors --< reviews --< product_ratings >-- products
```

All application tables have UUID primary keys, created_at and update-triggered
updated_at. The migration ledger uses a filename primary key because that is its
natural identity.

Separate categories/subcategories directly express the requested two-level model.
Composite foreign keys enforce a matching category/subcategory and a consistent
state/city/area. A later multi-category join can be backfilled from current values
without replacing vendor IDs or slugs. It is not needed now.

Locations are curated discovery units, not a complete administrative-boundary
database. Countries are fixed to MY. Cities include a city/district kind. SS15 is
seeded under Subang Jaya, consistent with [MBSJ's official locations](https://portal.mbsj.gov.my/sites/default/files/Senarai%20Dewan%20Serbaguna%20Mbsj%2023022024.pdf).
Address and optional paired coordinates remain separate from structured filters.
No invented precise addresses or coordinates identify real businesses in fixtures.

Vendor `status` controls moderation/lifecycle; `is_active` controls whether the
business is currently listed. Public visibility requires both published and
active. Nullable ownership supports admin-managed pilot listings; null never
means anyone may claim or update them.

Products have no stock, checkout or SKU model. Prices are nullable, nonnegative
MYR decimals; zero is allowed and differs from unlisted. Products and vendors
with dependent records cannot be hard-deleted accidentally; deactivate/archive.

Media stores relative object paths, not expiring signed URLs. Logo and cover are
unique per vendor, product images are unique per product, and gallery images have
display order. A product image must belong to the same vendor as its product.
Public metadata requires `is_public` and a publicly visible parent; product
images additionally require an active product. No upload policies or buckets
are created yet.

## Reviews and aggregates

An overall 1–5 rating is mandatory; text/name are nullable. Product ratings are
optional child rows with their own 1–5 constraint and no message column.
`(review_id, product_id)` is unique. The deliberate `vendor_id` on product ratings
allows two composite FKs to prohibit cross-vendor ratings at database level.
Deleting a review cascades its product ratings. Historical products are normally
deactivated rather than deleted.

Only published reviews of published active vendors appear publicly. Pending,
rejected and flagged reviews contribute nothing to public aggregates. Product
ratings inherit their parent review's publication. Inactive products are hidden
from public product aggregates; their stored history is retained.

Two ordinary security-invoker views provide live averages/counts; vendor summaries
also expose 1–5 star counts. No-review averages are null, counts zero. Distribution
percentages can be calculated from counts by the future UI. No cached counters,
materialized views or background jobs are needed for this size of directory.

## Future verification

`customer_id` references managed auth.users and has a partial unique index with
vendor_id when non-null. This accommodates authenticated/anonymous Supabase
identities and one review per identity later. Anonymous identity is not proof of
one human. Future submissions must require and derive the identity from a session;
nullable IDs currently support fixtures and deliberate deletion/anonymization.

`verification_status` defaults to unverified. No public writer can change it;
there is no verified-badge implementation. Only an evidence-backed future backend
may mark it verified. Account removal sets customer_id null while retaining the
review; ownership removal leaves a listing admin-managed. A later deletion policy
must also address user-entered personal text.

Visit-session IDs, risk scores/statuses, OTP, CAPTCHA, idempotency tokens and
verification history wait for their actual submission/verification workflows.
Adding nullable FK columns then is a small migration. No arbitrary UUID column
claims that a visit-session system exists now.

## Indexes

Unique constraints index slugs and taxonomy children within their parents.
Vendor indexes support category, subcategory, state/city, standalone city and
area filtering plus ownership. Product indexes support vendor/active/display
order. Review indexes support vendor/status/date pagination and customer lookup.
Product-rating indexes support product and review lookups and composite FKs.
Media indexes support vendor/type/order and product references. Some reverse-order
location indexes intentionally serve different leading-column filters.
No full-text, trigram or spatial indexes until discovery queries are implemented
and measured.

## Security boundary

All ten application tables enable RLS. Public and authenticated roles can read
only visible records. Both roles are denied INSERT/UPDATE/DELETE and cannot read
owner_user_id/customer_id. A browser publishable key is not an administration key.
RLS filters rows; explicit column grants hide identities. Views use
`security_invoker=true` to preserve underlying grants and policies.

No vendor/admin role assignment, owner mutations, review inserts, security-definer
RPCs or storage writes exist. Administration for this sprint uses the trusted
database connection outside the app. Future owner policies must preserve immutable
ownership/moderation fields and validate both old and new rows. Future review
submission must be an atomic operation covering the review and selected products.

Supabase-managed roles, auth schema and PostgreSQL 15+ are prerequisites. The
private migration ledger and update helper are not exposed through the Data API.
Keep Supabase's exposed schemas restricted to intended API schemas (normally public).

## Storage preparation

Use one **private** `vendor-media` bucket later, with immutable object names:

```text
vendors/{vendorId}/logo/{imageId}.webp
vendors/{vendorId}/cover/{imageId}.webp
vendors/{vendorId}/gallery/{imageId}.webp
vendors/{vendorId}/products/{productId}/{imageId}.webp
```

One bucket is sufficient because all media has the same ownership/lifecycle.
Private storage allows drafts and suspended content to stay gated; a public bucket
would bypass read restrictions for known object URLs. A future server will issue
short-lived signed URLs only after visibility checks. Existing signed URLs remain
valid until expiry. Uploads must verify actual ownership and validate image
size/type/content before marking metadata public. No bucket, uploads or URLs have
been provisioned during Sprint 1.

## TypeScript and tests

Database types are prepared from migrations with nullable fields and FK metadata;
they are explicitly not claimed to be generated from a live database. After hosted
application, generate public-schema types with Supabase's authenticated type
generation workflow and compare them before replacing the prepared file. No
repository/service abstraction is introduced. Browser and server clients disable
session persistence and token refresh until auth is deliberately implemented.

`db:validate` parses SQL and validates actual fixture IDs, slug/product-rating
uniqueness, hierarchy/FKs, rating values and expected sample averages. This cannot
prove database semantics or validate PL/pgSQL body execution.

`db:test` runs on hosted Dev with a privileged connection. It tests out-of-range
ratings, duplicate slugs/product ratings, invalid parent relationships, invalid
coordinates/prices, identity FK, image ownership, public/authenticated write
denial, private-column denial, unpublished-parent filtering, aggregate correctness
and review-delete cascade. It temporarily creates test helpers and media metadata;
the runner rolls back all changes even when tests fail. It expects the clean
fictional seed counts. No managed auth users are created by tests.

## References

- [Supabase API key conventions](https://supabase.com/docs/guides/getting-started/api-keys)
- [RLS and invoker views](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Column-level privileges](https://supabase.com/docs/guides/database/postgres/column-level-security)

## Sprint 4 update

Migration 20260926000400_review_submission.sql adds atomic customer review submission with auth.uid-bound ownership and server-signed CAPTCHA permits. Direct review writes remain denied. See [review submission architecture](review-submission.md) for the current authentication, moderation, key management and testing workflow. Earlier sections describe the Sprint 1 baseline; anonymous customer submission is now implemented.
