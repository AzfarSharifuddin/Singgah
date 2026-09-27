# Customer review submission (Sprint 4)

## Application flow

`/vendor/[slug]/review` loads an active published vendor and its active products
using public RLS. Missing/inactive/unpublished vendors return 404. The profile CTA
now links here. The form uses native keyboard-accessible radio inputs, optional
text (1,000 characters), and optional star-only product ratings. No reviewer name,
customer ID, publication state, or verification state is accepted from the form.

The singleton browser Supabase client persists its session in browser storage and
refreshes it. Merely browsing a vendor or opening the form creates no identity.
An existing session is reused. On the first valid submit, Turnstile runs and
`signInAnonymously` creates the customer session. A fresh challenge is obtained
for the review request: a token consumed by Supabase Auth CAPTCHA must not be
reused for application Siteverify. There is no signup UI or email/phone request.

The form checks `has_reviewed_vendor` for an existing session, including reviews
that are not published. It exposes only whether the calling identity already
reviewed that vendor. A conflict during submission shows the same friendly state.
Success links back with a full navigation, so the dynamic vendor page reads fresh
review and product aggregates rather than a previously visited router payload.

## Auth and Turnstile setup

1. In **Supabase → Singgah Dev → Authentication → Sign In / Providers →
   Anonymous Sign-Ins**, enable anonymous sign-ins and save.
2. Apply migrations: `npm run db:migrate`. Then run `npm run reviews:configure`.
   This copies the database-generated signing secret into ignored `.env.local`
   without printing it. No service-role credential is needed in application code.
3. For local `next dev`, set `TURNSTILE_TEST_MODE=true`. This uses Cloudflare's
   official always-pass test site/secret pair and still calls server Siteverify.
   It provides integration testing, **not bot protection**. It is refused when
   `NODE_ENV=production` or running on Vercel.
4. Before a public deployment, create a real Turnstile widget in Cloudflare and
   add the site's allowed hostnames. Configure `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
   `TURNSTILE_SECRET_KEY`, and comma-separated `TURNSTILE_ALLOWED_HOSTNAMES`
   (hostnames only, without scheme/port) in the deployment environment. Configure
   `REVIEW_SUBMISSION_SECRET` to match that deployment's database key using a
   secure secret-management channel. Never copy it into source or browser props.
   Turn off test mode and rebuild/redeploy when the public site key changes.
5. Enable Supabase Auth CAPTCHA protection with Turnstile in **Authentication →
   Settings → Bot and Abuse Protection**, using the matching Turnstile secret.
   This protects anonymous-account creation itself, including direct calls to
   Supabase. Review Siteverify alone cannot prevent account-creation spam.
   For Dev with Auth CAPTCHA enabled, use the matching official test secret;
   switch both Auth and app to matching real keys for production.

Missing production keys, allowed hostnames, or signing configuration disable the
form and return 503 from the API; protection never silently falls back to off.
The API verifies successful Siteverify responses, the `review` action and the
returned hostname against the server allowlist. Dummy keys are rejected in
production. Tokens are not trusted because the browser supplied them.

Sources: [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous),
[Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha),
[Cloudflare test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/),
[server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Atomic write and security boundaries

`POST /api/reviews` bounds request size to 16 KiB, checks same-origin submission,
validates the form, and verifies the bearer token through Supabase `getUser`.
It checks for an existing review, validates Turnstile, and signs the exact payload
with a two-minute expiry. It invokes `submit_customer_review` using the caller's
JWT and the public key. No elevated Supabase client is used.

The RPC is deliberately narrow `SECURITY DEFINER` with an empty search path and
fully qualified application objects. It checks `auth.uid()`, verifies the HMAC,
binds the signed identity to that UID, checks expiry and exact payload keys, and
validates every business rule. This permit is necessary: an unrestricted
authenticated RPC would allow callers to bypass the API's CAPTCHA check.
The signing key and moderation switch are in an unexposed, RLS-enabled private
table with all client privileges revoked. Neither key nor permit is returned to
the browser. Permit rotation must update the private table and server environment
together; mismatches fail closed. Use a new random 32-byte key through an admin
operation, not an edit to migration history.

The RPC inserts the review and all optional product ratings in one transaction.
Any invalid child rolls everything back. Existing composite foreign keys ensure
that review, product and vendor match, even for privileged writes. A unique
`(review_id, product_id)` constraint prohibits duplicate product ratings. The
existing partial unique `(vendor_id, customer_id)` index enforces one review per
non-null customer independently of application checks. Legacy seeded reviews with
null customer IDs remain unchanged. New RPC submissions always require a UID.

Public/anonymous roles still have no direct INSERT/UPDATE/DELETE grants or write
policies on review tables. Only `authenticated` can execute the two scoped RPCs.
Public reads continue to show published reviews, with customer IDs hidden.

A per-customer transaction advisory lock serializes duplicate and rate checks.
At most five reviews can be submitted per customer in a rolling hour, across
vendors. Owned vendors cannot be self-reviewed. Vendor/product rows are locked
while checked to prevent concurrent deactivation from invalidating the write.
This is a small database-based limit, without Redis or fingerprinting.

## Publication and verification

Validated submissions publish immediately and are always `unverified`. There is
no Verified Visit badge. An admin can change the single private configuration
row's `publish_immediately` setting to false, making subsequent reviews pending;
customers cannot change it. Existing reviews are unaffected. The success message
confirms receipt without promising a moderation outcome. No admin UI is included.

Migration `20260926000400_review_submission.sql` adds the private configuration,
two scoped functions, and a validated 1,000-character check. Previously applied
migrations remain immutable. Public database types follow the existing prepared
type strategy and include the two actual hosted RPC signatures.

## Verification and test data

```text
npm run test:reviews
npm run test:reviews-db
npm run db:test
npm run test:reviews-browser
npm run lint
npm run typecheck
npm run build
```

Database tests use transaction-only synthetic identities and roll back every
write. They verify star/text validation, cross-vendor and duplicate products,
atomic rollback, identity/permit checks, moderation protection, table privileges,
uniqueness, public aggregates and the hourly limit.

Browser tests use the existing Playwright/Edge runtime (`PLAYWRIGHT_MODULE`) and
`TEST_BASE_URL` (default port 3002). Run against local `next dev` with official
Turnstile test mode and enabled Supabase anonymous auth. Tests cover mobile and
desktop, scenarios A–D, duplicate attempts, invalid/hidden vendors and no products.
They create test anonymous identities and one temporary vendor, then remove only
the exact test IDs and their reviews in `finally`; seeded records are not edited.
Set `SCREENSHOT_DIR` outside the repository to save screenshots and a recovery
manifest of exact test IDs if the process is forcibly terminated. Do not run
seed-count regression tests concurrently with these temporary browser records.

## Current verification status

The migration is applied to Singgah Dev. Lint, TypeScript, production build, six
input/protection tests, 27 hosted review checks, and existing integrity/RLS and
public-read regressions pass. Real Edge checks pass at 375px and 1280px for the
form, keyboard stars, touch targets, no eager identity, no-products and 404 states.
The existing profile/discovery browser suites also pass. Production was exercised
with local test mode set: the form is unavailable and POST returns 503 as intended.

Supabase anonymous sign-ins are now enabled. Live submission scenarios A–D and
the no-products scenario pass with real hosted anonymous sessions and official
Turnstile test challenges. Identity persists across reloads and navigation;
duplicate attempts show the friendly existing-review state. Rendered vendor
averages/counts, star distribution and product averages/counts update after
publication. No runtime or console errors occurred in the completed submission
suite. All test identities, reviews and temporary vendors have been removed.
Production still requires real Turnstile keys and matching Auth CAPTCHA setup.

## Known limits

Browser storage identifies a session, not a person. Clearing storage, using private
browsing or another device can create another identity. The hourly limit is also
per identity. No invasive fingerprinting, IP profiling, OTP or NFC verification
is implemented. Anonymous Auth retention/cleanup and traffic monitoring need an
operational policy before significant public traffic. No editing, deletion,
vendor replies, review photos, reporting or moderation dashboard is included.

## Terms acceptance and community sorting

New submissions require an explicit termsAccepted=true in application validation. The server signs the current terms version in its short-lived permit. Migration 20260927000300 replaces the RPC with the same security/transaction model plus required acceptance/version checks; it stores terms_version and terms_accepted_at atomically with the review. These columns have no public SELECT grant. Existing reviews stay NULL (no fabricated acceptance). Changing terms requires a coordinated new version and RPC migration. Deploy the application and migration together; old clients fail closed and must reload.

/vendor/[slug]?reviewSort=newest|highest|lowest&reviews=2 sorts published reviews in PostgreSQL before pagination. Rating sorts break ties by newest timestamp, then ID. Default/invalid sort is newest. Applying a different sort resets the review page.

The initial /terms wording needs owner/legal review before public launch. Add the actual operator identity, support/data-rights contact and a separate privacy notice once these are supplied; do not invent contact details or treat the checkbox as blanket privacy consent. Malaysian privacy notice guidance: https://www.pdp.gov.my/ppdpv1/en/akta/guidance-on-the-preparation-of-personal-data-protection-notices/ . Email registration testing remains paused at the owner's request.
