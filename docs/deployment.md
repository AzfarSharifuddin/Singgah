# singgah.cc deployment

Target: Vercel hosting with Cloudflare DNS. The repository is
`wanpenter/Singgah`. This document records setup requirements; it does not confirm
that deployment, DNS, SMTP, or invitations have been completed.

## Vercel

Import the existing GitHub repository into the intended Vercel account/team.
Use the Next.js preset, repository root, Node.js 24.x, `npm ci`, and
`npm run build`. Do not select the parent local workspace as the app root.

Configure Production environment variables before deploying:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `REVIEW_SUBMISSION_SECRET` matching the configured database signing key
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`
- `TURNSTILE_ALLOWED_HOSTNAMES=singgah.cc,www.singgah.cc`
- `TURNSTILE_TEST_MODE=false`

Keep database administration credentials out of Vercel unless a specific runtime
feature requires them. The app uses public-client credentials and scoped database
permissions. Apply migrations separately through trusted database tooling; never
run the development seed against production. Check whether the existing Singgah
Dev project is the intended live database before modifying it.

## Cloudflare DNS

Add `singgah.cc` to the Vercel project's Domains settings. Add `www.singgah.cc`
only when configured to redirect to the apex domain. Copy the exact A/CNAME/TXT
values returned by that project into the Cloudflare zone. Do not guess a shared
Vercel IP or CNAME destination. Configure the web records as DNS only while
verifying Vercel routing and TLS. Keep the existing Cloudflare nameservers.

Inspect existing records before changing conflicting web records. Preserve MX,
email-verification TXT, SPF, DKIM, DMARC and unrelated subdomains. Confirm Vercel
reports the domain valid, HTTPS works, and the www redirect reaches the apex.

## Supabase authentication and outbound mail

Set the production Site URL to `https://singgah.cc`. Allow the exact vendor
confirmation callback `https://singgah.cc/auth/callback` and the admin invitation
callback documented in `admin-management.md`. Keep email confirmation enabled.

Configure custom SMTP with the user's mail provider, verify its sender domain,
and copy its exact verification/SPF/DKIM records into Cloudflare. Merge SPF rather
than adding a second SPF record. Do not create a new mailbox or paid subscription
unless requested: authentication invitations only require outbound mail.

The default Supabase sender restricts recipients and has low quotas. An email API
success response alone is not evidence of inbox delivery. Send the authorized
invitation to `azfarrsharifuddin@gmail.com` after callback and SMTP configuration;
record the provider delivery result and verify the recipient can accept the invite
and enter the protected admin dashboard. Never put invitation tokens, passwords,
SMTP credentials, or service-role keys into Git, logs, or the chat.

## Verification

Run lint, typecheck and a production build with Node.js 24. Apply and verify admin
authorization migrations before exposing admin routes. Check vendor login,
registration callback, anonymous review session separation, unauthorized admin
access, and approval/rejection visibility. Confirm email delivery independently.

References: [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain),
[Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
