# Public visual design

## Six-section editorial homepage

The homepage follows the approved photo-led composition, using generous spacing,
fine rules and a warm ivory canvas rather than many decorative panels:

1. Picture 4 opening: “Stories Make Places Brighter” at bottom left and Explore
   Singgah at bottom right. No white overlay or supporting hero paragraph.
2. “A little stop. A new story.”: a short introduction beside the local shop photo.
3. “What brings you here?”: six photographic category links. Small screens use a
   native horizontal strip with keyboard focus revealing off-screen links.
4. “New to the neighbourhood”: up to three real public vendors. One result pairs
   the existing vendor card with the section heading; multiple results form a grid.
5. “Somewhere familiar. Somewhere new.”: heritage photograph and one destination
   selector using database state/federal-territory options. A native GET form opens
   `/discover?state=<slug>`; selecting no destination opens all-vendor discovery.
6. “Your business has a story.”: a short invitation linking to `/vendor/register`.

The footer retains FAQ and terms. Full search, city/area filtering, sorting and
pagination stay on `/discover`. Categories and destinations remain database-driven.
The homepage adds no client component, custom carousel library or new dependency.

Full-width background bands distinguish the sections without adding decorative
boxes: introduction/latest vendors/footer stay ivory, categories use pale
Rembulan (`#f1e7d6`), destinations use soft cream (`#f5eee3`), and the closing
vendor invitation uses Hutan with Rembulan text and a cream action button.
Content widths remain constrained inside each full-width band. The opening
photograph, typography, data and destinations are unchanged.

## Typography

The reference uses EB Garamond for its large editorial text and Courier for small
navigation labels. Singgah now uses a self-hosted EB Garamond normal 400 Latin
WOFF2 (23,820 bytes) through `next/font/local`, with `display: swap`. The shared
`EditorialShell` wraps the homepage, discovery, vendor registration/sign-in, FAQ
and terms. These routes reuse one font definition and file; other application
routes retain their previous fonts. Navigation, action labels and the destination control use
system Courier New/Courier. Controls stay at readable sizes with 44–48px tap targets.

The existing text-only SINGGAH wordmark retains its Arial weight and tracking.
Functional vendor-card details and category labels retain Arial; card titles use
the homepage serif. No browser Google/Adobe font requests are required. The font
source details and SIL Open Font License are in `src/app/fonts/README.md` and
`src/app/fonts/OFL.txt`.

## Photographs

Only WebP derivatives in `public/images/home/` are served. Originals in the
user-supplied `Pictures/` folder are untouched. These editorial/category photos
illustrate local life; real business cards continue using actual Supabase media.
Some categories use general local shop imagery rather than literal product shots.
Unknown categories use the market walkway as a fallback, keeping their real links.

| Source | Web asset | Width | Quality | Use |
| --- | --- | --- | --- | --- |
| `4.jpg` | `kampung.webp` | 1600px | 76 | Opening |
| `Food & Beverage.webp` | `food.webp` | 640px | 78 | Food & Beverage |
| `Fashion & Attire.jpg` | `fashion.webp` | 640px | 78 | Fashion & Attire |
| `Beauty & Personal Care.jpg` | `beauty.webp` | 640px | 78 | Beauty & Personal Care |
| `Crafts & Lifestyle.jpg` | `market-walkway.webp` | 640px | 78 | Crafts & Lifestyle / fallback |
| `Services.jpg` | `shops-at-night.webp` | 640px | 78 | Services |
| `Other.jpg` | `heritage.webp` | 1200px | 78 | Other and destination photograph |
| `5.jpg` | `local-street.webp` | 960px | 78 | Introduction and closing detail |

Derivatives use the existing Sharp dependency: rotate for orientation, resize
without enlargement, encode WebP at effort 6. Unused earlier city, market-street
and shophouses derivatives were removed. No original image was removed. No
base64 photography or third-party conversion service is used.

The opening source is about 268 KB compared with its 5.1 MB original. Next Image
additionally serves responsive `srcset`/`sizes`. Only the opening photo is
preloaded; below-fold images are lazy. `fill` containers reserve dimensions and
tile aspect ratios. The repeated street photograph shares one source asset.

Public media permissions, existing ten-minute signed URL batches, upload
processing and rating calculations are unchanged. Public vendor profiles, review
forms and dashboard screens retain their existing styling and behaviour.
No migrations, hosted writes, auth, Turnstile or review-protection changes are
part of this design implementation.

## Discovery, account entry, FAQ and terms

- Discovery uses a full-width market photograph behind its introduction/search
  area on all screen sizes, white editorial text and a cream search action.
  A dark tint maintains text readability; there is no white overlay. The image
  is preloaded with `sizes="100vw"`; below-fold result covers stay lazy. The
  soft-cream filter band stays below the photograph. Mobile filters
  retain their existing toggle. The exact state/reset/normalization logic,
  server query helpers, count, sorting and pagination URLs are unchanged.
  Result cards and input text retain Arial for small-text readability.
- Registration and sign-in share `VendorAuthLayout` and both opt into a wallpaper
  layout behind a centered ivory form panel at every width. Registration uses the
  neighbourhood-shop photo; sign-in uses the street-cart photo from `Pictures/6.jpg`.
  Registration has a live password checklist for minimum length, uppercase,
  number and special character. Its input and server action share the policy;
  sign-in still accepts existing passwords. Styling is
  scoped through `.editorial-auth`; `ActionForm`, existing sign-in rules,
  CAPTCHA instance/options and session behaviour are unchanged.
- FAQ uses native keyboard-accessible `details`/`summary` elements to reduce the
  initial text density. The first answer starts open. All 11 questions and answers
  are preserved verbatim. A full-width heritage street photo sits behind the
  white heading/intro, matching discovery's dark readability tint. It is
  preloaded with responsive sizing; the answers remain on ivory below.
- Terms keeps all nine sections, version and displayed update date unchanged.
  A compact native contents disclosure links to stable in-page section anchors.
  Review-return links retain the existing slug validation and safe fallback.

New derivatives in `public/images/editorial/`:

| Source | Web asset | Width | WebP quality | Bytes | Use |
| --- | --- | --- | --- | --- | --- |
| `Pictures/9.jpg` | `market.webp` | 1600px | 75 | 122,118 | Discovery background |
| `Pictures/8.jpg` | `neighbourhood-shop.webp` | 800px | 74 | 173,430 | Registration |
| `Pictures/7.jpg` | `heritage-street.webp` | 1600px | 75 | 174,488 | FAQ background |
| `Pictures/6.jpg` | `street-cart-portrait.webp` | 900 × 1200px | 74 | 165,258 | Previous portrait derivative |
| `Pictures/6.jpg` | `street-cart-wallpaper.webp` | 1600 × 1072px | 74 | 233,284 | Sign-in background |

Originals are untouched, and no image is used as a fictitious business listing.
The other new supplied photos remain available for later use. The source photos
are several megabytes each; the application requests responsive Next Image
derivatives, not the originals.

Visual verification does not submit registrations, send confirmation mail or
solve CAPTCHA challenges. Missing local Turnstile configuration remains visible
through the existing form warning; no keys or bypasses are added for styling.

## Verification

### Login wallpaper

The login page now uses the street-cart photograph as a full-width background
behind a centered ivory form panel on mobile and desktop. The photograph fills
the main section as its content grows, with a dark readability tint; it no longer
appears as a separate panel below the form. Registration uses the same wallpaper
presentation with its own neighbourhood-shop photo. The shared auth layout exposes
an opt-in `wallpaper` presentation flag.
`street-cart-wallpaper.webp` is a 1600px-wide WebP derivative of `Pictures/6.jpg`;
Next Image serves responsive sizes. Registration alone adds the live password
requirements described above; CAPTCHA configuration and session handling remain
unchanged.

### Customer review page

The approved Cover & form layout reuses the vendor's public cover and logo in a
compact, darkened banner above one narrow ivory form. The rating is first,
optional product ratings start collapsed, and native radio/checkbox controls
retain keyboard and touch support. New reviewer names are limited to 20
characters in the input and shared API validator. Security logic and existing
review publication, duplicate checks and terms-version rules are unchanged.

`node scripts/test-review-editorial-browser.mjs` exercises the real hosted vendor
page at mobile/tablet/desktop widths, the name limit, keyboard stars, product
selection/removal, terms-return draft recovery and missing-vendor 404. It creates
no identities or reviews and does not automate CAPTCHA challenges.

### Public vendor profile layout

The vendor profile now uses the same local EB Garamond headings, text wordmark,
editorial shell and quiet footer as discovery and the homepage. The vendor's own
cover photograph sits inside a contained, rounded business card aligned with the
page content, with an overlapping rounded-square logo. The cover is 176px tall
on phones and 260px from 640px. Identity, rating and contact links sit below it;
the review action sits to the right on larger screens and fills the mobile row.
Instagram, TikTok, Facebook and WhatsApp use small locally served brand glyphs;
calling uses a handset icon. All icon links retain accessible names. Only
populated, safely formatted links appear.

About, products, optional gallery, reviews and location use full-width sections.
Products have ivory cards on a lighter cream background, edge-to-edge 4:3 images,
two-line expandable description previews, and aligned price/rating footers.
The grid has one column on phones, two from 640px, and three from 1024px.
All active products remain available. Empty galleries and their jump link are
omitted; other missing-data fallbacks remain. Reviews retain database-derived
ratings, newest/highest/lowest sorting and server pagination. No Supabase schema,
public visibility, review submission, authentication or Turnstile changes apply.

`node scripts/test-vendor-editorial-browser.mjs` checks the current real public
vendor at 320, 375, 768, 1024 and 1280px, including product geometry, aligned
prices, local social logos, editorial typography and section links. It performs
no writes or account creation.

- `node scripts/test-home-browser.mjs`: read-only real-data checks at 375, 768
  and 1280px; six sections, actual loaded local font, unchanged wordmark,
  responsive images, hero alignment, category keyboard access, destination
  options/navigation, discovery search, vendor profiles, registration route,
  FAQ and terms. Full-page captures scroll vendor images into view before
  decoding so lazy photos are present. No page overflow or browser errors.
- `node scripts/test-public-performance-browser.mjs`: discovery/profile/product
  layout/ratings/review-route and sorting regressions, with real current data.
- `node scripts/test-discovery-logos-browser.mjs`: optimized public logos,
  profile links and corrupt-image initials fallback.
- `node --test scripts/test-public-data.mjs scripts/test-discovery.ts scripts/test-vendor-format.ts`:
  query batching, cache boundaries, literal search/pagination and formatting.
- Run ESLint, Next route type generation, TypeScript and production build normally.

Browser scripts accept `TEST_BASE_URL`, `TEST_BROWSER_CHANNEL`,
`PLAYWRIGHT_MODULE` and optional `SCREENSHOT_DIR`. They do not require hosted
data mutations or authentication changes.

In the coding sandbox, Windows can block Turbopack junction creation and Webpack
`.next` output directories with access-denied/EPERM errors. The alternate
validation command is `node node_modules/next/dist/bin/next build --webpack --experimental-next-config-strip-types`.
Report filesystem build failures separately; passing dev compilation, type
checks or browser tests does not constitute a completed production build.
