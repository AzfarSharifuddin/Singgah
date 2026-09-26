# Singgah

Stories Make Places Brighter.

Next.js App Router, TypeScript, Tailwind CSS, ESLint and the Sprint 1 Supabase foundation.
The landing screen is a temporary development placeholder, not the product homepage.

## Development

Use Node.js 24.x and npm. Install locked dependencies with `npm ci`, then run
`npm run dev` and open http://localhost:3000.

Validation commands:

```text
npm run lint
npm run typecheck
npm run build
npm start
```

The bootstrap session used bundled Node.js and workspace-local npm; no system-wide
software was installed. npm is a development tool, not an application dependency.

## Configuration

No environment variables are required to build or run the unchanged placeholder.
Supabase operations require the following values in ignored `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://yclwktzpthezflzhoeuk.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_DB_URL=
```

Get the `sb_publishable_...` key from Singgah Dev's API Keys settings. This is the
current public-client key convention, replacing legacy anon keys. The client
rejects secret/service-role keys. Never commit credentials or put a privileged
key in a `NEXT_PUBLIC_` variable. No service-role client exists in this project.

`SUPABASE_DB_URL` is optional for application reads but required by database
scripts. Obtain the **session pooler** connection URI from the dashboard Connect
dialog and supply its database password locally (percent-encode reserved password
characters). The runner requires verified TLS and targets only Singgah Dev. A
publishable key cannot apply SQL migrations. No local PostgreSQL, Docker, CLI
login, or local Supabase stack is required.

Supabase browser/server factories currently perform public reads only. Auth
cookies, sign-in, anonymous customer creation, owner writes and admin flows are
intentionally deferred.

## Database workflow

Run commands from the repository root:

```text
npm run db:validate
npm run db:migrate
npm run db:seed
npm run db:test
npm run supabase:check
```

`db:validate` needs no credentials. It parses migrations, fixtures and tests using
the PostgreSQL SQL parser, then checks the actual seed's relationships and values.
It does not execute SQL, RLS or PL/pgSQL. The parser is a development dependency,
not a local database server.

`db:migrate` applies ordered migrations in a transaction with an advisory lock and
checksum ledger at `private.singgah_migrations`. It skips already-applied files,
rejects edits to their checksums and rolls back on errors. Add a new migration to
evolve the schema; never edit an applied migration. Use this runner consistently:
it does not update Supabase CLI migration history. Production targeting and CI
deployment credentials are intentionally not configured in this sprint.

`db:seed` explicitly inserts fictional Dev fixtures in one transaction. Stable IDs
make repeated runs preserve existing fixture rows; natural-key collisions cause
a rollback rather than overwriting other work. It is never run during application
builds or migrations. Do not seed production.

`db:test` runs constraint, column-permission, RLS and aggregate assertions against
a clean seeded Dev dataset, then rolls back every test write. It requires a
database administration connection capable of SET ROLE, not a publishable key.
Do not run it concurrently with work that changes fixtures.

`supabase:check` uses the official public client and explicit column selections to
read a vendor, its category/location, products, reviews, product ratings and
summary. It does not create any API route or UI.

The runner trusts the official public Supabase CA in `supabase/certs/prod-ca-2021.crt`
and verifies the server hostname. This is a public certificate, not a credential.
If Supabase rotates its CA, verify and update the certificate from the official
dashboard source; do not disable certificate verification. Missing credentials block hosted operations only.
The scripts do not print connection strings or keys.

## Schema overview

| Tables | Purpose |
| --- | --- |
| `states`, `cities`, `areas` | Structured Malaysian discovery hierarchy |
| `categories`, `subcategories` | One category, optional matching subcategory per vendor |
| `vendors` | Business identity, contacts, current location and publication |
| `products` | Optional MYR prices and active catalog items |
| `vendor_images` | Logo, cover, gallery and product image paths |
| `reviews` | Overall stars, optional text/name, moderation and future identity |
| `product_ratings` | Optional star-only children of a business review |

Supabase supplies `auth.users`; the migrations do not recreate it. Read-only,
security-invoker views calculate vendor/product averages and counts without
storing aggregate values. Public roles have SELECT access only, subject to RLS
and column grants. Identity columns are not public. Use explicit column lists
for vendors/reviews; `select('*')` is intentionally denied for these tables.

The Dev seed contains 6 categories, 31 subcategories, 5 states, 6 cities/districts,
7 areas, 6 fictional vendors (5 published and 1 draft), 15 products, 6 reviews and
7 product ratings. No fake Storage objects or images are seeded. See
[database design and security notes](docs/database.md) for relationships, indexing,
verification decisions, future Storage layout and test limitations.

## Structure

```text
src/app/          App Router layout, placeholder page and global design tokens
src/lib/supabase/ Public browser/server client factories and configuration
src/types/        Prepared database types
supabase/         Versioned migrations, fictional seed, rollback-only tests
scripts/          Hosted database workflow, SQL validation and connectivity check
docs/             Database decisions and security boundaries
```

The `@/*` alias resolves to `src/*`. Using `src` separates application code from
root-level tooling. Shared components and public assets will be added when needed.
shadcn/ui is not installed yet.

## Brand tokens

Tokens live in `src/app/globals.css` and expose Tailwind color utilities:

| Token | Color |
| --- | --- |
| Hutan | #1B3D2E |
| Terracotta | #C26A4A |
| Rembulan | #E9D7B7 |
| Emas | #B7904F |

The placeholder uses system fonts, avoiding build-time font downloads. It is
marked noindex; revisit metadata when public product pages are ready.

Sprint 2 requires approval before any product-screen work begins.

## Tooling compatibility

ESLint is pinned to 9.39.5 because the React plugin supplied by the current
Next.js ESLint config fails under ESLint 10. npm marks ESLint 9 deprecated;
upgrade when the Next.js lint plugin chain supports ESLint 10. No lint rules
are disabled to hide this incompatibility.
