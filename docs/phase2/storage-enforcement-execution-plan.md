# Storage enforcement: reviewed execution plan

Status: applied and verified on the shared SmartCart database on October 11, 2026. Recorded version and canonical repository filename: 20261011062506_secure_pantry_vault_limits.sql. SQL is unchanged; see storage-migration-history-reconciliation.md. The execution sequence below documents the reviewed procedure, not a request to replay it.

## Approved rules

Free: five reusable Recipe Vault recipes; no new or updated cloud pantry memory. Plus: no vault tier cap and cloud pantry writes. Everyone retains owner-only reads/deletes; existing vault edits and upserts do not consume slots. Downgraded accounts retain over-cap recipes but cannot add more until below five. An empty pantry array is an explicit clear and remains allowed; a nonempty unauthorized pantry replacement fails the whole week-save transaction. Week history is not a reusable vault save. Session-only pantry inputs and guest behavior are preserved.

## Exact migration

`20261011044914_secure_pantry_vault_limits.sql`, reproduced in storage-enforcement-reviewed.sql. Only three new triggers, three private functions and one private counter table are added. Existing plan structure, protected profile privileges, owner RLS, subscriptions, weekly save function and content remain untouched. Confirmed non-anonymous auth.uid identity and the current protected profile.plan authorize browser writes. A missing profile fails to Free; missing/deleted/unverified identities fail closed. Protected profile rows are locked during writes. Private helpers/counter are inaccessible to browser roles. Existing trusted database/service_role maintenance retains its privileges and maintains counters; no public API exposes that role.

## Execution sequence, requiring separate shared-database approval

1. Freeze the exact migration checksum for approval. Confirm no other pending migrations will be bundled. Recheck database/project mwxvorzrausbnqzjrhqm, auth confirmed_at/is_anonymous columns, existing owner policies and profile plan/beta_status write restrictions. Confirm private schema/object names are unused and zero orphaned vault owners. This stage's read-only check found zero conflicts/orphans.
2. Complete real multi-connection PostgreSQL and PostgREST tests in an isolated runtime before shared application: competing fifth/sixth inserts, parallel downgrade and insert, transaction rollback, repeatable-read serialization failure with safe retry, and REST insert/update/upsert/delete/RPC status handling. PGlite queues concurrent requests on one embedded database; its passing Promise.all test is not proof of independent production connections. Completed in the isolated Docker lab on October 11, 2026: see isolated-local-test-report.md for actual REST and independent-connection evidence and routing limitations.
3. Capture protected owner-only snapshots/counts and profile/subscription fingerprints without publishing recipes or contacts. Schedule a short maintenance window. The migration's vault write lock makes counter backfill and trigger installation atomic; short-lived DDL locks can briefly block writes. Abort if lock waits are excessive; do not leave a half-applied change.
4. Apply **only** the approved migration in one transaction via the Supabase migration mechanism. Verify recorded version and checksum. Do not run an unrestricted db push that might include other migrations.
5. Read-only verify counters equal vault counts; check triggers, fixed search paths, RLS, denied browser helper execution and unchanged profiles/subscriptions/content. Run database advisors and review differences. Do not perform destructive retention cleanup or use real users as synthetic fixtures.
6. Test preview flows with separately approved disposable accounts or isolated fixtures. Production uses this same database, so database application is itself a production-affecting change even without a website deployment. Keep recruitment/email/beta entitlement flags disabled and PR #1 draft.

## Rollback

storage-enforcement-rollback.sql removes only the named triggers/functions/counter, leaves all user content and owner RLS intact and deliberately leaves the private schema. No CASCADE. Tested against isolated fixtures; plan/subscription rows and all content survive. It restores previous client-only tier enforcement, so rollback weakens these newly added tier controls and requires explicit approval. Do not execute it as part of routine verification. Follow-up reapplication needs a separately reviewed migration/history plan, not an unrecorded replay.

## Remaining review points

Existing mutable-search-path trigger functions and publicly executable legacy trigger functions were raised by live Supabase advisors; this migration does not silently alter account-creation dependencies. Review them separately. No new paid infrastructure was installed. A shared SMTP switch, production code deployment and recruitment launch each require their own approval.
