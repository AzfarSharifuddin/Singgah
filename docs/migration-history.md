# Migration history verification

Before applying new migrations, run npm run db:audit. This command opens a read-only transaction against the approved Singgah Dev project, compares private.singgah_migrations with normalized-LF SHA-256 hashes of local SQL files, and lists pending/missing/changed files. It never changes the ledger, schema, records or local SQL. npm run db:migrate retains its strict checksum enforcement.

## Reviewer-name migration changed in Git

The file supabase/migrations/20261014091404_require_reviewer_name.sql was introduced by commit f30f27f and edited by commit 204537c to wrap constraint creation in an existence check. The deployed history must be inspected before choosing the canonical file; Git alone does not show which version was applied.

Known source checksums:
- f30f27f: 664131a181f6025456af1ac4cae4d778134900923e609bdc74be07770ef2d345
- 204537c: 54a4c64c89cd3a0df624689d2980c66ea2587accc98c8e74e3872b7ceee0c2ac

If the ledger matches f30f27f, restore that exact file from Git before running migrations. Put any subsequent schema change into a new timestamped migration. If it matches 204537c, keep that version unchanged. If it matches neither, stop and inspect the actual deployed migration/source; never silently replace a checksum or re-run a migration over an existing schema. If the ledger has no record but the schema exists (for example a dashboard/MCP application), verify the deployed definitions and provenance before explicitly reconciling the ledger. Do not blindly mark a migration applied because a table exists.

On 17 October 2026, the hosted ledger was audited successfully. Every historical checksum matched the current repository; the reviewer-name migration matches the 204537c version. No historical SQL or ledger checksum needed changing. The new 20261017000100_discard_unfinished_product.sql migration was then applied through the standard checksum-tracked runner. Never put connection URIs or passwords in this document or logs.

## Cleanup validation

After a successful audit and migration, run npm run test:product-cleanup-db. It tests owner-only cleanup, no direct DELETE permission, cross-owner/anonymous/public denial, image/rating/object/age/active guards and idempotence using rollback-only synthetic records. The vendor browser suite also exercises a malformed image and verifies that its temporary product disappears before creating a product with a valid required photo.
