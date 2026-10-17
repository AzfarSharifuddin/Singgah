# Performance maintenance — 17 October 2026

This pass reduces public read work while preserving the existing result data,
permissions, review transaction, image formats and user interface. It adds no
dependency, database migration, background worker or paid service.

## Changes

- Public categories, subcategories, states, cities and areas share a Next.js Data
  Cache entry, namespaced by Supabase project URL, with a 300-second revalidation
  interval and the `discovery-options` tag. React `cache` still deduplicates reads
  within a render. This removes five upstream calls on a warm request.
- The homepage requests its three latest cards directly, without calculating an
  unused exact total. It starts the catalogue and vendor requests together.
  Discovery retains its exact count, twelve-item pagination, ordering and filters.
- Profiles run products → product summaries and image metadata → URL signing as
  parallel branches alongside reviews and vendor summaries. Product summaries
  are joined with a Map instead of repeatedly scanning the ratings array.
- Public media and private proof uploads read the input file into a Buffer once
  and reuse it for validation and compression. Size/type/pixel limits, WebP output,
  ownership checks and compensation for failed uploads are unchanged.

## Freshness and security

Vendor records, publication checks, products, reviews, rating aggregates, signed
media URLs, authentication and dashboard data have **no new shared cache**.
They continue to use the current Supabase client, grants and RLS. Signed URLs
still expire after ten minutes and require a fresh permitted signing request.

Only public reference lists may lag an administrative database change. After
300 seconds, Next.js can serve the previous list while revalidating in the
background; failures can extend this interval. It is not a strict five-minute
freshness guarantee. There is currently no in-app taxonomy editor. When adding
one, invalidate `discovery-options` from its authorized server mutation; use
`revalidateTag("discovery-options", { expire: 0 })` when an immediate refresh is
required. Do not expose an unauthenticated cache-purge endpoint.

`unstable_cache` is the supported compatibility API for this project's current
configuration. Next.js recommends `use cache` with Cache Components; enabling
that changes route-level caching conventions and is outside this maintenance pass.

## Image delivery

Discovery and homepage cards now use the real business logo when available,
with initials for absent or broken images. A page makes one public logo-metadata
query in parallel with its rating query, then one batch Storage signing request
for the returned logos. This adds at most two upstream requests per result page,
not two per vendor. A warm page with logos therefore uses four upstream requests
(vendors, ratings, logo metadata and batch signing), versus the historical two-read
measurement below before logos were displayed. Without logo records, signing is
skipped. Empty results skip both extra requests. URLs are not shared-cache entries.
The fixed 56px image slot uses Next.js responsive thumbnails and lazy loading.

Logo regressions: `node --test scripts/test-public-data.mjs` and, with a running
app plus an existing public vendor/logo, `node scripts/test-discovery-logos-browser.mjs`.
The browser test verifies thumbnail sizing, mobile/desktop layout, homepage use
and corrupt-image fallback without writing hosted data.

Uploads are already resized/compressed server-side, rather than storing raw
camera originals: logos up to 512px, other media up to 1600px, with WebP encoding
and a 500 KiB target (the final fallback is not a guaranteed 500 KiB cap).
Public profiles still use `next/image`, responsive `sizes`/`srcset`, lazy product
and gallery loading, and the existing private Storage signing policy. Browser
checks fetch and decode a real optimized image. No base64/string conversion is
needed; converting an image to a string does not compress it.

Expiring signed URLs can reduce image-cache reuse because a new signature changes
the optimizer's cache key. This pass deliberately preserves that security model.
Longer-lived URLs, public buckets and persistent signed-URL caching need a separate
decision about media visibility and revocation.

## Verification

```text
npm run test:public-data
npm run test:public-performance-browser
npm run lint
npm run typecheck
npm run build
```

The browser suite needs a running application, public Supabase configuration and
at least one published active vendor. It uses the current hosted dataset rather
than assuming all original seed vendors are still public. Set `TEST_BASE_URL`,
`TEST_BROWSER_CHANNEL` and `PLAYWRIGHT_MODULE` when using an existing browser
runtime. `SCREENSHOT_DIR` is optional. It makes no business/review/storage writes
or authentication attempts.

Verification on this pass:

- Eight new tests cover query constraints, pagination, reference caching/error
  recovery, fresh summaries, concurrent dependent requests, missing images and
  upload-buffer reuse with real Sharp encoding. Existing 23 unit tests also pass.
- Direct before/after hosted reads produced identical homepage cards, five
  discovery scenarios and profile data, excluding the changing signed URL text.
- Real production Next.js tracing confirmed seven Supabase reads on the cold
  homepage request and two on subsequent warm requests. Both vendor data and
  ratings were read again on each request. The current Dev dataset is small;
  the twelve-to-three row reduction is additionally covered by the query test.
- Three small profile-helper samples observed median 126ms before and 110ms after.
  Connection warm-up, network variation and this small sample prevent treating
  those numbers as a production speedup or concurrent-user capacity guarantee.
- Chrome smoke tests passed at 375px and 1280px: homepage/search, combined filters,
  profile/product/rating rendering, optimized image retrieval/decoding, review route,
  sorting, back navigation, clear/empty states, invalid filters/pages, 404 and the
  protected dashboard redirect. No runtime errors or horizontal overflow observed.
- Hosted ownership/RLS (21), cleanup (14), admin security and review security (35)
  checks passed. All database test writes were rolled back. The old review script
  assumes published original seed vendors; they are no longer public, so its
  regression run staged their expected visibility only inside the rollback test
  transaction. The unadapted seed-dependent script still needs fixture isolation.
- ESLint, direct `tsc --noEmit --incremental false`, SQL syntax/seed checks and a
  complete Webpack production build passed. The regular `npm run typecheck` and
  `npm run build` commands hit the existing Windows sandbox native path
  canonicalization error (`Access is denied`) while loading `next.config.ts`.
  Build verification used
  `next build --webpack --experimental-next-config-strip-types`, which also
  generated route types and ran TypeScript. Production scripts/config were not
  changed to hide this environment limitation.

Vendor/customer registration and actual form submission were not replayed through
the browser: local Turnstile configuration is still missing. The existing auth
and review protection remain enabled and their database/unit regressions pass.
No hosted schema, permanent records, credentials, commits or deployments were
changed by this performance pass. Previous maintenance changes remain in the
working tree separately from these optimizations.
