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
- Registration and sign-in share `VendorAuthLayout`: the form is first on small
  screens and beside a neighbourhood-shop photograph on desktop. Styling is
  scoped through `.editorial-auth`; `AuthForm`, `ActionForm`, server actions,
  password rules, CAPTCHA instance/options and session behaviour are untouched.
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
| `Pictures/8.jpg` | `neighbourhood-shop.webp` | 800px | 74 | 173,430 | Registration/sign-in |
| `Pictures/7.jpg` | `heritage-street.webp` | 1600px | 75 | 174,488 | FAQ background |

Originals are untouched, and no image is used as a fictitious business listing.
The other new supplied photos remain available for later use. The source photos
are several megabytes each; the application requests responsive Next Image
derivatives, not the originals.

Visual verification does not submit registrations, send confirmation mail or
solve CAPTCHA challenges. Missing local Turnstile configuration remains visible
through the existing form warning; no keys or bypasses are added for styling.

## Verification

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
