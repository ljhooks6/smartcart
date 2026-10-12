# One controlled release sequence — prepared, not authorized to execute

## Resolved account decision

Preserve the individually reviewed existing Free account pending administrator review. It remains Free; its content is neither deleted nor converted. Use the UUID-bound operator manifest prepared privately outside Git from `docs/preserve-reviewed-free-account.sql`. The template validates verification, stored Free status, saved content and both database gates being off. It is idempotent and cannot be executed by browser or service roles. Do not exempt every Free user or treat saved content as admission.

All existing verified stored Plus accounts are snapshotted for preservation regardless of payment evidence. Administrators and active beta participation remain independent sources of access; pending invitations are retained and do not authorize use until accepted. No genuine paid subscriptions currently exist. Temporary beta Plus remains separate from stored plans. New ordinary accounts need approved, recipient-matched, verified, active participation. Public landing, documents and application do not require MealCaddie authentication.

## Integration order and safety prerequisite

Read-only remote-head verification on October 12, 2026: main `95fe3fc7ba09e08808b86d4bfdb6a7c2d2b657c2`; PR #1 head `f1fc576cfd16f8eabe6489f87bcfb04aecdcae0b`; PR #2 head `d7d463532b63eeebbf067ba48a29da9164af8940`; published PR #4 head `0ca31f0440bf3b90bcb79309cb1e216e3efecc0e`. This policy amendment is local and not deployed. Reconfirm exact heads at release time.

PR #1 is an ancestor of PR #2, which is an ancestor of PR #4. They are one cumulative stack, not three independent releases. Do not cherry-pick duplicate Phase 1 commits or sequentially merge the unfinished PRs into production. Prepare one reviewed integration candidate based on current main and the cumulative reviewed stack, then review its complete diff and release approval. Keep PRs #1/#2/#4 draft until that review; reconcile their eventual disposition without replaying commits. A merge into main triggers the existing production pipeline, so approval must cover the exact merge and resulting deployment together.

The read-only merge comparison identifies conflicts in six food API route files, `lib/meal-generation.ts`, `components/smart-cart-app.fixed.tsx` and `components/smart-cart-context-form.tsx`. These require explicit resolution, not choosing a whole side indiscriminately. Preserve the main allergy-safety module byte-for-byte, all pre-provider HTTP 422 restrictions, disabled ingredient consolidation and visible safety notices; add eligibility and Preview-envelope handling around those restrictions. The larger Preview matcher must never replace them. Review output against PR #3 and run its before/after vulnerabilities plus the whole 225-test suite again on the final integrated tree. This document does not perform a merge.

## Database sequence: no replay

The shared project `mwxvorzrausbnqzjrhqm` already records exactly these repository versions:

| Version | Migration | Release action |
| --- | --- | --- |
| 20261009223526 | atomic_week_save_and_vault_recipe_details | Already applied; verify, never replay |
| 20261011003203 | beta_recruitment | Already applied; never replay PR #1 |
| 20261011003522 | beta_browser_deny_policies | Already applied; never replay |
| 20261011023528 | beta_email_delivery_ledger | Already applied; do not use the earlier draft version |
| 20261011062506 | secure_pantry_vault_limits | Already applied; do not use 20261011044914 |
| 20261011153040 | beta_onboarding | Already applied; do not use 20261011141927 |
| 20261012203230 | public_beta_access_and_agreements | Only new migration awaiting approval |

1. Obtain approval for the final exact checksum of the new migration AND the private one-account preservation manifest. Recheck target, migration history, absence of conflicts and current definitions; capture auth/profile/subscription/content/participation/invitation fingerprints, storage counters and preservation identities. Review active locks and a quiet maintenance window. Do not use blanket `db push`, database reset, repaired-history replay or the obsolete draft migration names in historical reports.
2. Apply only the new migration, with its transaction, 5-second lock timeout and 30-second statement timeout. Abort uncommitted work on error. Keep database `enabled=false`, `legal_enabled=false` and all public/delivery release flags off. Verify history exactly once; if the migration service records a different timestamp, reconcile the filename without changing SQL before any future migration command.
3. Execute the separately approved private preservation manifest while both database gates are off. Verify exactly one reviewed Free preservation row plus the expected Plus snapshot, unchanged profile plans and zero new subscription/grant/invitation/agreement records. Do not activate the product gate if the selected Free account lacks its preservation record. Validate all original content fingerprints and restrictive RLS/triggers, including direct REST behavior in an approved isolated test.
4. Record the final schema and manifest checksums, execution results and rollback backups privately. No agreements may be backfilled. These are prepared execution steps, not shared execution performed by this task.

## Protected verification and production cutover

1. Separately approve publishing the local revision to protected Preview (a push triggers deployment). Preserve Vercel Authentication. Use isolated database fixtures for gate-on tests; enabling the shared database product gate also affects current production REST access and needs production-impact approval. Verify the selected preserved Free account, existing Plus/admin, active participants, invitation recipients, new unauthorized accounts, direct API/RLS, expiration and saved content. No real emails are needed for these tests.
2. Complete mobile/keyboard/screen-reader release checks and approve accurate public privacy/legal copy, controller identity and retention operations. Draft Texas governing-law language and an explicit operator placeholder remain review drafts. No fabricated agreement history; shared legal enforcement stays off unless separately approved.
3. After exact production merge/deployment/configuration approval, release the reviewed integrated candidate in the maintenance window. Preserve current authentication settings, Stripe disablement and the existing protected pilot Preview. Prepare the application eligibility flags and coordinate the database gate so there is no interval advertised as invitation-only while direct REST remains ungated. Do not expose recruitment during this transition. Verify deployment commit and domains, HTTP 422 with zero mocked/provider calls, permitted requests, preserved identities and saved content before reopening normal traffic.
4. Product eligibility requires `BETA_PRODUCT_ACCESS_ENABLED=true` and Production `BETA_PRODUCT_ACCESS_RELEASE_APPROVED=true`, plus `beta_access_configuration.enabled=true` for direct database enforcement. Preserve existing temporary grants by separately reviewing `BETA_ONBOARDING_ENABLED=true`, `BETA_ONBOARDING_RELEASE_APPROVED=true`, `BETA_ENTITLEMENTS_ENABLED=true`; these also expose recipient acceptance/feedback routes, so approve their exact scope. They do not authorize sending. Keep `BETA_INVITATION_DELIVERY_APPROVED`, pilot dispatch and test-email sending false. Do not revoke or reissue pending invitations. Program boundary stays `2027-01-01T05:59:00Z`; 30-day defaults remain capped.
5. Publish reviewed documents with `LEGAL_PUBLICATION_APPROVED=true` only after approval. Keep `LEGAL_LANGUAGE_APPROVED`, `LEGAL_STORAGE_APPROVED`, `LEGAL_GATE_ENABLED` and database `legal_enabled` false until an independently approved agreement rollout. If that rollout is approved, verify matching immutable versions, actual unchecked affirmative acceptance and legacy cutoff exemptions; do not backfill consent.
6. Only after public-application approval, set the four production prerequisites `BETA_PUBLIC_LAUNCH_APPROVED`, `BETA_APPLICATIONS_ENABLED`, `BETA_PRIVACY_REVIEW_APPROVED`, `BETA_CONTACT_MAILBOXES_VERIFIED` true. Verify Turnstile's exact production hostname, key presence without values, challenge rejection, rate limits, duplicate response, private directory and separate Formspree operation. Visitors may apply without an account; an application never authorizes app use. Keep invitations and automatic emails disabled. The current auth limit of 2/hour need not be raised merely to collect applications; increased onboarding capacity is a separate decision before larger acceptance waves.

## Bounded recovery

On failed preflight, do not execute. On transaction failure, abort uncommitted work. On deployment/safety failure, stop and use a forward safety correction; do not restore the vulnerable pre-PR #3 application. With separately approved recovery, close applications, pause new acceptance and disable the new database/application gates while preserving all evidence, invitations, content and existing grants. Turning off the product gate can restore broader pre-beta access: report that consequence and obtain the exact recovery approval.

The reviewed empty-evidence schema rollback refuses to remove a Free preservation decision, agreement or privacy-request evidence. Once the private Free manifest is applied, prefer operational recovery and forward correction, not dropping the preservation ledger. Do not delete decision evidence just to make rollback pass. Never automatically restore older storage or allergy enforcement.

## Genuine remaining launch gates

- One reviewed integration candidate resolving the nine production-safety conflicts, with full checks on that exact tree.
- Separate approval for protected Preview publication, the one new shared migration/private preservation manifest, production merge/deployment and scoped gates.
- Verified legal operator/public privacy wording and final retention/export/deletion handling. Texas and MealCaddie are resolved; operator identity and legal review remain explicit.
- Fresh physical iOS/Android checks and full NVDA, VoiceOver and TalkBack flows: anonymous application/Turnstile, labels/errors, consent, authentication return, invitation acceptance, feedback and focus recovery. Keyboard-only and 200% zoom/no-overflow checks supplement these; source inspection does not certify screen-reader use.

No new paid service, billing rollout, advanced analytics, extra invitation wave or authentication rate increase is required to open public applications. No such action is included in this sequence.
