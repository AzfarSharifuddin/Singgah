# Admin vendor moderation

The new routes are `/admin/login`, `/admin`, `/admin/password`, and
`/admin/invitation`. Admin pages use the existing HttpOnly Supabase session, so
signing in/out of admin also replaces/removes the vendor cookie session. The
anonymous customer review session stays separate.

Admin access comes from `private.admin_users`, never editable user metadata,
an email submitted by the browser, or a public environment variable. Every page
and mutation checks a confirmed non-anonymous Auth user. The database RPCs also
check membership independently of the page guard. No service-role key is used by
the runtime app. Removing membership revokes subsequent list/moderation access.

## Apply and bootstrap

Apply migration `20261005000100_admin_management.sql` through the existing
checksum-tracked migration runner against the approved Singgah Dev database.
Do not edit earlier migrations or seed production. A separate production database
requires an explicitly configured deployment/migration process.

Configure outbound SMTP first. In Supabase, set Site URL to
`https://singgah.cc`, allow `https://singgah.cc/admin/invitation`, and customize
the **Invite user** email link to:

```html
<a href="{{ .SiteURL }}/admin/invitation?token_hash={{ .TokenHash }}">Accept your Singgah admin invitation</a>
```

This uses server-side `verifyOtp` with invitation tokens; the default fragment
token redirect cannot be read by a server handler. Links must not be logged,
shared, or committed. The recipient opens the invitation and chooses their own
password at `/admin/password`. An invitation confirms identity but does not grant
admin membership by itself.

Send the authorized invitation to `azfarrsharifuddin@gmail.com` using the Supabase
Auth dashboard. After the Auth account exists, provision only that account through
trusted SQL (before the recipient opens the link):

```sql
insert into private.admin_users(user_id)
select id from auth.users
where lower(email) = 'azfarrsharifuddin@gmail.com' and not is_anonymous
on conflict (user_id) do nothing;
```

Verify that exactly the intended user has membership. If the email already has an
Auth account, preserve it: grant membership to its existing ID and use its normal
password login. Do not delete/recreate an existing vendor account. Invitations and
membership provisioning are pending until hosted account access is available.

## Decisions and tracking

The dashboard searches business names literally, filters status, and paginates
20 businesses at a time in stable creation-date/ID order. It includes description,
category, location, submission date, active status and the latest decision reason.

Approve changes `pending`/`suspended` to `published`. Reject changes
`pending`/`published` to `suspended`, with a required 3–1,000 character reason.
The label is **Rejected / suspended** because the existing schema has no separate
rejected vendor status. Draft/archived records are visible for tracking but not
moderatable. Approval does not override `is_active`; an inactive profile stays
hidden. Owner permissions and public RLS are unchanged.

Moderation locks the vendor row and rejects a stale expected status before
updating. It writes the decision, actor, previous status, reason and timestamp in
the same transaction. The private audit table is accessible through trusted SQL;
there is no destructive delete action in the UI. Repeated decisions are rejected.
Existing signed media URLs may still work until their expiry after rejection.

## Verification and limitations

Run `npm run test:admin`, `npm run test:admin-db`, lint, typecheck and build with
Node.js 24. The DB test is rollback-only and creates its own identities/business
using existing Dev taxonomy; it requires migrated Singgah Dev credentials. Do not
claim SQL parsing proves RLS behavior. Verify login, unauthorized access, invitation
acceptance and desktop/mobile dashboard behavior against the hosted database.

Live migration, admin creation, SMTP configuration, delivered invitation and
authenticated browser flows are unverified until account access is available.
