# Focused tier release

Baseline: production main 11efe7c66ecfd33f14fa7ebfbb38f88a307eb879. Branch feature/finalize-product-tiers. No provider/model, account, billing, invitation, safety, legal or retention change.

## Counting and enforcement

Full-plan requests reserve one allowance for queued/running/completed work. Server-resolved effective membership supplies Free 5 / Plus 20 to the service-only reservation RPC. Guests remain 3/day. Requests rejected before reservation consume nothing. Failed jobs are excluded; provider retries and replayed request IDs reuse one reservation. A new full-plan request, including rebuilding a weekly plan, counts once. Individual replacements and recipe regeneration use existing separate endpoint safeguards, not weekly-plan allowance. Internal Plus refinement stays within one job.

The unchanged window starts Monday 00:00 UTC and resets seven days later. Existing completed plans beyond revised allowances remain accessible; new admissions wait until reset. Saved content is not truncated.

## Exact pending database change

20261013193916_finalize_product_tiers.sql replaces only mealcaddie_private.track_vault_count(). Free insertion threshold changes 5 to 10 and its error says ten. Atomic counter updates, rollback on cap violation, effective storage membership (including temporary beta Plus), ownership and private permissions remain unchanged. Plus retains its existing no-numeric-tier-cap policy, owner confirmed; this release introduces no new unlimited-storage promise.

SHA-256: 6aed4b5f2f5f7e21916f898337c9d24911bfdf6fbd518adc0f298280b822054f.

## Execution, verification and rollback

Separate owner approval required before shared apply to mwxvorzrausbnqzjrhqm. Recheck hash, migration history, current function and privileges. Capture ordered fingerprints/counts of accounts/profiles, subscriptions, vault, pantry, weekly menus, applications, invitations and participations; compare after. Apply this SQL alone with 5-second lock and 30-second statement timeouts. An uncommitted timeout aborts without changes. Verify execution once, unchanged ACL/security-definer empty search path, trigger binding and counter-to-row counts. No production synthetic content writes needed; use disposable database tests for limits.

Record the actual execution version in the repository without changing SQL bytes. After migration verification, merge only this reviewed PR and verify Vercel production commit and /beta availability. Without migration approval, leave PR unmerged and production unchanged.

Rollback requires approval: restore the original track_vault_count function and its private ACL from 20261011062506_secure_pantry_vault_limits.sql in a bounded transaction. Do not drop tables, counters, triggers or delete recipes. Existing over-five recipes remain; only subsequent Free insertions are restricted. Restore application commit if necessary without reverting dietary safety. Accounts, plans, subscriptions and beta records stay untouched.

Verified release checks: 246 tests passed; TypeScript, lint and production build passed. Shared migration recorded as 20261013193916; approved SQL bytes/checksum unchanged. All baseline profile/subscription/content/application/invitation/participation fingerprints match, four accounts preserved, zero vault counter mismatches, and private function ACL/search path unchanged. No emails or pilot edits.
