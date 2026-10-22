# Authentication and household integration review

## Review scope

`feature/auth-onboarding-integration` is stacked on approved Founding Testers commit `beb92f8a4da9f353e211c865f130f853b2ab2209` / draft PR #12. Its approved layout, screenshot viewer, captions, FAQ, application controls and consent remain intact. The only landing addition is an offline sample link. No PR #9 code is included. No hosted flags, Auth configuration, customer records or production schema were changed.

Existing work already supplied Google/email-link authentication, encrypted invitation-return cookies, preferred-name setup, application/admin review, recipient-bound invitations, explicit acceptance, participation and feedback. This branch adds password access and household setup around those components rather than replacing their access policy.

## Integrated journey

1. Public landing → existing application and consent → existing private administrator approval/invitation. Applying never grants access and no second application is required.
2. Open personal invitation. Existing Google users keep their usual provider/UUID. New invited users register their exact recipient email, username and password; Supabase sends verification. Registration alone does not activate participation.
3. Verified login returns to the invitation using the existing encrypted, HttpOnly return cookie. Reopen the original invitation if switching browsers or the return cookie has expired. Exact verified email and any previously bound UUID must match. Newly registered recipients can accept an initially unbound invitation; the existing atomic database acceptance function binds it.
4. Review participation notice and explicitly accept. Only this existing acceptance transaction activates the approved Free/temporary Plus cohort. Stored plans, Stripe records and existing administrator privileges are unchanged.
5. Three optional household steps save caller-scoped Auth metadata. Interrupted answers resume in the same account/browser; Next also saves cloud progress. Existing accounts have an optional setup link. Completed setup is not repeated. Account switching clears the previous owner's unsaved draft and guards every save against a changed session.
6. Final setup hands only planning defaults to Plan, without replacing a saved week or generating anything. Skipped quantities/budget are blank for review; skipped equipment is empty. Restriction text uses the existing fail-closed dietary format and still produces the production 422 restriction.
7. Existing participation/feedback screen remains available after activation.

Guest `/explore` bundles a single clearly labeled engineering example with Plan/Shop/Cook and local shopping checkmarks. No anonymous AI, database writes, inventory access or enrollment. The invitation to continue leads to the existing application; invited testers can go directly to their personal invitation.

## Security and rollout flags

- `ACCOUNT_EXPERIENCE_ENABLED=true` enables the new password/household endpoints. It defaults off. Production additionally requires `ACCOUNT_EXPERIENCE_RELEASE_APPROVED=true`. Neither was set on a hosted environment in this task.
- Supabase, never local application code, verifies passwords. Username resolution is service-only; no public name-to-email or availability endpoint. Unknown names and wrong passwords return the same message, invoke Auth and have a minimum response duration. This is enumeration mitigation, not a formal constant-time guarantee. Existing secret-hashed network and identity rate buckets bound requests; Supabase's current shared email limit was not increased.
- Signup requires an issued, unexpired, unbound recipient invitation and an active program; generic responses avoid revealing eligibility. Username metadata is only a proposed label. The verified user claims it through the service-only unique directory, so a collision may require choosing another name during setup. No account is administratively created or linked.
- Ordinary Google/email-link authentication and preserved-user policies remain. Username/password is an alternative, not an account conversion.
- Recovery returns to the exact existing approved origin. A callback-type navigation hint is captured before the SDK clears the fragment; it stores no token or authorization decision. Password writes still require the caller's verified Auth session and exact origin. Cancel recovery signs out. No password is persisted in application data or logs.
- Do not enable hosted registration before confirming Supabase email confirmation is required. Provider-direct signup is a separate Auth configuration boundary: this application gate is **not** a Supabase Before User Created hook. Before claiming provider-wide invite-only account creation, separately approve and verify an appropriate Auth hook/policy, including Google and existing-account compatibility. The existing server-side product-access gate remains authoritative regardless of account creation.

## Unapplied migration review

File: `supabase/migrations/20261022210035_account_username_directory.sql`

SHA-256 (reviewed file bytes): `8a0dcdc1a7bd07708ea02bdd674a3b8540fa3ca1807e2b484525946fbac4fd29`.

One empty username directory and one claim function; no backfill, profile/plan changes or subscription writes. Depends on existing `auth.users`, `beta_verified_user(uuid)` and Supabase roles. One transaction, 5-second lock timeout, 30-second statement timeout. UUID FK cascades only on an independently authorized Auth-user deletion. Username/UUID uniqueness makes concurrent claims safe. RLS explicitly denies browser roles; all table/function permissions are revoked from PUBLIC/anon/authenticated and limited to service-role select/insert/execute. The invoker function uses an empty search path and validates email verification. Existing mappings are immutable to ordinary callers.

Before any shared application: fresh identity/history/object-conflict/dependency preflight, checksum guard and apply **only this migration**, then inspect grants/RLS and claim behavior without changing existing users. Requires separate approval. Rollout rollback first disables the feature flags and leaves mappings intact. A schema rollback may drop the function and table only if empty and separately approved; populated aliases should be preserved for continuity. No automatic destructive rollback.

## Verification and evidence

- 37 focused authentication, redirects, invitation handoff, household, isolated migration and Founding Testers tests passed. Includes generic wrong/unknown login, rejected origin, rate denial, missing/expired/consumed/bound/wrong-recipient registration, verified/unique/immutable username claims, browser-role denial, captured-owner guard, strict metadata/password payloads, recovery callback timing, skipped-default isolation and unchanged allergy 422.
- 38 existing onboarding API/database/public-access tests passed and reused: atomic redemption, replay/concurrency, ownership, entitlements and feedback/access boundaries. No unrelated full application suite repeated.
- TypeScript, lint and the optimized production build passed with isolated synthetic settings. The first build's page collection required the existing fake AI key; that local-only setup correction passed. No paid call occurred. Existing local Queue region / Browserslist / Next lint-deprecation notices are not feature failures. The generated route-type output reference was restored before committing.
- Actual local browser: guest Shop/Cook keyboard interaction; invited signup → mocked verification → matching recipient → explicit acceptance → resumed household setup → Plan; returning username login without repeated setup; existing Google UUID preserved; existing-user optional setup; invalid invitation; unauthorized verified account denied; recovery callback → reset form → cancellation. Caller-scoped fake password update and subsequent password login were verified through the real application API with the disposable Auth fixture.
- Local mobile viewports were 320px and 390px. Login tab order reaches password; step headings receive focus; error/status regions and labels are present; no horizontal overflow observed on reviewed screens. Physical keyboards/soft-keyboards and NVDA/VoiceOver/TalkBack still require owner/device verification.
- The fixture contains four disposable `.invalid` identities (three seeded and one registered), no real messages or provider calls. Its issued invitation is seeded; application/administrator preparation is covered by existing automated tests, not a new hosted submission. Planning status polling reports unavailable because generation-job storage is not modeled; no AI plan was generated or charged. Real Supabase email/OAuth delivery is **not** proven by the mock.

Screenshots: [login 320](evidence/account-login-320.jpg), [signup 390](evidence/account-signup-390.jpg), [household 320](evidence/account-onboarding-320.jpg), [household 390](evidence/account-onboarding-390.jpg), [guest 320](evidence/account-guest-320.jpg), [recovery 320](evidence/account-recovery-320.jpg), [access denial 390](evidence/account-access-denied-390.jpg). Synthetic data only.

## Exact remaining approvals / launch recommendation

Ready for isolated code/UI review; **not yet ready to activate hosted password registration**.

1. Approve the reviewed username migration after fresh shared preflight; do not bundle other migrations.
2. Separately review/approve hosted Auth signup controls (including direct-provider creation), confirmation/recovery delivery, exact redirect origins and any controlled real-email test. Existing 2/hour auth capacity remains unchanged; an increase is a separate decision.
3. Approve a bounded protected-preview activation of the new feature flag after its database/Auth prerequisites. Existing approved-origin Google/email-link access remains unchanged; the new branch-specific hostname is deliberately not added to the exact auth-origin allowlist. Hosted password/setup actions fail closed. A functional hosted Auth test requires either an explicitly approved binding to the already approved protected preview origin or separate approval for the exact new origin in code and Supabase. Recheck recipient-bound registration, recovery and existing Google identities against an approved test system before release.
4. Complete physical-device/full screen-reader verification, then explicitly approve coordinated PR #12/integration merge and production release/flag activation. Neither merge nor production activation is authorized by this development task.

No billing, allergy, subscription, invitation-delivery or recruitment-activation changes are needed for this branch itself. Keep both draft PRs and PR #9 unmerged.
