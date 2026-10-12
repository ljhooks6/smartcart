# MealCaddie isolated local testing — October 11, 2026

## Outcome

The approved local tests passed. The pantry/vault migration is ready for a separate, specific shared-database application approval, subject to a fresh preflight. Authentication branding and original-template restoration passed locally; a controlled shared SMTP switch can now be reviewed separately, with real-provider verification and rollback gates.

No shared Supabase project was connected, queried or migrated. No production credentials, customer information or dedicated Resend key were used. No external authentication mail, real invitations or marketing were sent. Existing application code and the reviewed migration were not changed. PR #1 was verified draft and unmerged on feature/beta-recruitment. Production recruitment controls were not changed.

## Environment and isolation

- Existing unlinked lab: work/auth-email-lab; project_id mealcaddie-auth-isolated; no project-ref/link file.
- Docker's initial WSL detection was stale after installation. One Docker Desktop restart resolved it; engine version 29.8.2 ran successfully. No Windows feature or BIOS setting was changed.
- Pinned Supabase CLI 2.120.0 started PostgreSQL 17.11.0.004, Auth 2.197.0, PostgREST 16.4, Mailpit 1.31.3 and Kong 2.8.1. A pinned pg 8.16.3 client was installed only in the work directory for independent connections.
- The CLI initially published ports on all interfaces despite a loopback-default network. Services were stopped before disposable account/API testing. Published containers were recreated with explicit 127.0.0.1 mappings: API 54321, PostgreSQL 54322 and mail sink 54324. Auth and REST had no direct host publication.
- Recreating Kong removed generated files. The local gateway's HTTP Auth/REST routes and static template server were repaired, with Auth and PostgREST retaining their own JWT authorization and RLS. This adapted gateway is **not a byte-for-byte reproduction of Vercel/cloud routing**. Template rendering and database guards exercised the actual local Auth/PostgREST/PostgreSQL services.
- Only generated example.invalid identities and explicitly disposable storage/subscription fixtures were used. Local keys stayed in memory/private container configuration; issued links/tokens, mail bodies and credentials are not in reports or Git.
- Test callbacks use localhost:5501 and 127.0.0.1:5501, not the existing application on port 3001. Redirects were inspected and returned tokens validated against local Auth; no browser callback application was exercised.
- All five lab services are stopped. Disposable volumes remain private for review; no global Docker cleanup or production action was performed.

## Complete results

| Test group | Passed | Failed |
|---|---:|---:|
| Existing application regression suite | 131 | 0 |
| Actual branded Auth/mail-sink scenarios after restoration | 9 | 0 |
| Actual original-template Auth/mail-sink scenarios | 8 | 0 |
| Template restoration/restart/restore checks | 4 | 0 |
| Actual PostgreSQL/PostgREST storage migration scenarios | 13 | 0 |
| Additional invalid/unconfirmed/stale-identity scenarios | 3 | 0 |

These are separate scenario groups; the restoration group includes an aggregate assertion for its original-template subtests. Do not interpret their sum as a single application test-suite count. Detailed assertion names are in the accompanying JSON reports.

### Actual authentication mail

All six branded templates produced rendered mail in the local sink with their expected subjects, HTML, usable plaintext and no unresolved template variables: signup confirmation, magic login, invite, recovery, secure email change and reauthentication. Secure email change delivered to both old and new disposable addresses. Reauthentication rendered an eight-digit dynamic code.

Signup and magic-login verification issued valid sessions for the expected local user; both exact local redirect origins were retained. Reusing consumed links failed without another session. Signup and magic-login expiry failed as expected. Expiry was tested deterministically by aging only the disposable account's sent timestamp beyond the configured 3600 seconds; this was not a one-hour wall-clock wait. An unapproved redirect returned to the isolated Site URL, never production. A recovery link also issued a local session at its requested origin. Invite/change/reauthentication templates were validated as local delivery/rendering cases; dormant application UI flows were not enabled.

### Authentication rollback rehearsal

The complete baseline bundle first passed checksum, variable, subject and settings validation. All six original body files were restored byte-for-byte to their captured hashes, all original subjects loaded, and Auth restarted. Actual original-template delivery tests passed for all six templates, with active confirmation/login verification and expiry/replay checks. The same pre-restart disposable identity/session still worked. Branded bodies and original branded subject configuration were then restored; the same identity/session survived again. Fresh branded email tests passed afterward.

The SMTP provider stayed local Mailpit throughout. This verifies template/config restoration and restart readiness; it does **not** verify a Resend-to-built-in provider reversal, Resend TLS/credential acceptance, mailbox deliverability, SPF/DKIM/DMARC or email-client rendering.

### Storage migration and independent connections

- Exact reviewed SQL applied locally, preserved seeded over-cap recipes/pantry and the simulated active subscription, and did not edit profile plans itself.
- Real REST Free saves one through five succeeded; sixth save returned 403. Plus saved beyond five and persisted pantry memory.
- Missing/invalid authentication, wrong owner, user_metadata claiming Plus and client profile-plan changes failed. Unconfirmed identity could not log in or bypass the database verifier. A valid stale JWT failed after its disposable identity became anonymous or was deleted.
- Own-row reads/edits/deletes remained available after downgrade, including over-cap vault rows. Adding more vault recipes and pantry updates were denied immediately with the same JWT. Restoring the protected profile to Plus restored additions without token refresh. These were local simulations, not real subscription changes.
- Six-row bulk overflow rolled back all rows and counter changes. Existing-row upsert at cap succeeded without consuming another slot. Tests accept PostgREST's successful 200 update/upsert response as well as 201 insertion.
- Week-only saves worked. A prohibited pantry payload through save_mealcaddie_week returned 403 and rolled back the complete week/pantry transaction. Explicit empty-pantry clearing worked.
- Twelve simultaneous HTTP saves with four existing recipes yielded exactly one success and eleven denials, ending at five.
- Two independent repeatable-read PostgreSQL connections competed for the last slot. The losing writer failed with SQLSTATE 40001; no sixth row survived. Applications should retry a serialization failure conservatively against the current entitlement/cap.
- A separate downgrade connection waited behind the authorized writer's profile lock; once committed, later additions were denied. A write legitimately authorized before downgrade was retained.
- Private helpers/counters remained inaccessible to browser roles and REST RPC discovery. Counter totals matched actual rows after denied and competing writes.
- Reviewed rollback removed the local guards/counter without changing local content, identities or simulated subscriptions. Reapplying the same migration backfilled counters and restored denials.

Early harness failures were corrected: native Auth signup returns a user directly; original subject substitution needed longest-string-first matching; an upsert returned 200; safe-update API calls required explicit owner filters. These were fixture/assertion problems, not changes to the migration or application.

## Recommendation: storage migration approval

Recommend approving only **20261011044914_secure_pantry_vault_limits.sql** for SmartCart, using storage-enforcement-execution-plan.md. Its tested SHA256 remains **8C5BF422A1949F85BEC06327ECDA895E00B3B45AA9198AA586CD2A8AC5DF5E90**.

Before applying, recheck the actual shared schema, owner policies, protected profile privileges, confirmed identity columns, object-name conflicts, orphan owners and current profile/subscription/content baselines. This stage intentionally did not query shared Supabase. If the preflight differs materially, stop for review. Apply only this migration, not all pending SQL. The existing five-second lock and thirty-second statement timeouts bound installation; check trigger/counter consistency and unchanged data afterward. Keep beta grants, recruitment and emails disabled. A production-affecting database application and any rollback each need explicit approval.

## Recommendation: authentication SMTP approval

Recommend a separately approved, owner-attended controlled switch, with immediate rollback if the first authorized message fails. Prepare the exact configuration: smtp.resend.com, implicit TLS port 465, username resend, sender auth@mealcaddie.app and display name MealCaddie. The owner enters the dedicated domain-scoped credential privately; never include it in chat or repository files.

For the first switch, apply only the reviewed active magic-login and signup-confirmation branding; preserve the four dormant shared templates until their application flows are separately approved. Keep the Site URL, exact redirect list, Google OAuth, OTP length/expiry, accounts and subscription behavior unchanged. Preserve the recorded hourly email limit of 2 unless a specific increase is approved; assess that limit separately before recruitment launch.

Require explicit approval for the configuration/template switch **and** the identity, registered recipient, number and timing of a real preview authentication test. Verify receipt, sender, link return to protected preview, existing user/admin identity and continued Google access. Do not reuse the already consumed application-acknowledgement email approval. Restore original subjects/bodies, disable custom SMTP to return to the recorded built-in provider, and restore original relevant settings if verification fails. Real inbox rendering and provider-switch reversal remain controlled follow-up tests; no public launch is recommended by these local results alone.

## Evidence files

isolated-auth-test-results.json; isolated-auth-original-template-results.json; isolated-auth-rollback-results.json; isolated-storage-test-results.json; isolated-storage-identity-results.json. Existing original backups, reviewed migration/rollback and execution plan remain available in outputs and docs/phase2.
