# Public visual refresh

The approved direction combines a forest-green hero, delicate gold floral
linework, a thin batik strip, and compact photo-led business cards with circular
logos. The existing text-only Singgah wordmark, homepage wording, Arial body
font and existing serif heading stack are retained. No web fonts were added.

The homepage still says “Stories Make Places Brighter” and keeps its original
description, search, category shortcuts, state shortcuts and latest vendors.
Discovery keeps its category/location filters, cascading selections, URL state, sorting and
pagination. Its search/intro and filter panel share the same form as before;
only their visual placement changes. Decorative accents are hidden from assistive
technology and do not intercept pointer input. Cards have no favourites or arrows.

## Assets and data

- `public/brand/floral-corner.svg`: 2.4 KB botanical linework.
- `public/brand/batik-border.svg`: 0.9 KB repeatable tile strip.
- `src/components/brand/brand-accents.tsx`: shared hero and rosette divider markup.
- Existing Supabase cover photos supply card imagery; no fictional business
  photos from the concept mockups were added to the application or database.
- Missing/failed covers use the existing image placeholder; missing logos use
  initials. Logos retain their small 56px slot and use `object-contain`; covers
  use a consistent 12:5 crop with responsive `sizes`.
- Logos and covers share **one** public metadata query and **one** Storage signing
  batch per result page. Only the current three homepage/twelve discovery vendors
  are requested. At most 24 image paths are signed for twelve cards, with the
  existing ten-minute expiration and public RLS checks. Request count stays the
  same as the logo-only implementation; image payload now includes responsive
  covers. Only the first discovery cover is prioritised; other covers are lazy.

No database migrations, new dependencies, authentication changes, Turnstile
changes, review-protection changes or hosted data writes are part of this refresh.

## Checks

The public-data tests exercise shared cover/logo signing, foreign-path exclusion,
gallery exclusion, missing-media fallback, existing filtering and pagination.
The logo browser regression targets the logo explicitly now that each card can
also contain a cover. Browser checks additionally verify original homepage copy
and font families, mobile filter expansion, combined filters, clear/empty states,
real photos and lack of horizontal overflow at 375px and 1280px.

Run the existing lint, TypeScript, build, public-data and browser checks. No test
needs to enable/disable CAPTCHA or mutate business data. Full-build verification
in the coding environment can encounter Windows EPERM while creating generated
`.next` directories; this is reported separately from compilation/type checking
and must not be treated as a successful full production build.
