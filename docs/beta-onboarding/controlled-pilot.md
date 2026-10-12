<!-- Recipient and identity examples in this document are synthetic. Real pilot records are owner-only and are not stored in Git. -->
# Controlled two-person pilot

Protected intake: https://preview.mealcaddie.app/beta/pilot-apply on feature/beta-onboarding. Vercel Authentication stays enabled; public intake, sending and activation remain disabled. PRs #1 and #2 remain draft and unmerged.

## Participant intake

Free: synthetic-person-4@example.invalid, verified UUID 99999999-9999-4999-8999-999999999999, stored Free.
Temporary Plus: synthetic-person-3@example.invalid, verified UUID 88888888-8888-4888-8888-888888888888, stored Free.
Administrator 77777777-7777-4777-8777-777777777777 remains Plus/admin and is excluded from pilot messages/grants.

Both participants personally open the intake URL after normal Vercel and MealCaddie sign-in. Check the read-only verified email, answer the normal questions, read the privacy notice, explicitly check participation consent, choose optional marketing consent independently, complete Turnstile if prompted and submit once. Applying neither sends mail nor approves or activates access. Existing applications are displayed without overwriting answers/consent. No signup email is needed; do not request another authentication email without authorization. If signed out, Rachel can use her existing Google authentication; Proton needs an existing session or separately authorized normal login.

The server verifies Supabase identity/email confirmation, matches both UUID and email, derives the authorized address on the server, validates consent/questions and Turnstile, and uses existing atomic rate limiting and unique intake RPC. No client-controlled cohort, tier or grant is accepted. Administrators cannot bypass personal intake.

## Administrator review

Use https://preview.mealcaddie.app/admin/beta with the confirmed administrator account. Search each exact address, inspect actual answers/consent, save Under Review, then approve and assign Proton to Free and Rachel to Plus. Review counters/audit history. Optimistic versions and database seat locks reject conflicts. Do not approve unrelated applications or queue invitations yet. Filters apply to displayed bounded records; wider recruitment requires pagination review.

## Current configuration

Branch-only BETA_PILOT_MODE, BETA_ONBOARDING_ENABLED, BETA_PILOT_INTAKE_ENABLED and BETA_PILOT_AI_LIMIT_ENABLED are true. BETA_PILOT_IDENTITIES binds exactly the verified pairs above. Entitlements, invitation delivery, provider callbacks, public applications and production release gates remain false. BETA_PILOT_CONSENT_EMAILS and BETA_PILOT_INVITATION_IDS remain empty pending delivery approval. BETA_INVITATION_ORIGIN=https://preview.mealcaddie.app.

Database onboarding_enabled and invitation_delivery_enabled remain false. Default participation is 30 days, capped at 2027-01-01T05:59:00Z (December 31, 2026, 23:59 America/Chicago). Invitations expire after seven days. No underlying plans or subscriptions are changed.

Preview AI uses one shared atomic allowance of five provider-starting operations/hour and 20/day across plans, recipes, replacements and consolidation. Requests above 32 KB fail before provider work; capacity errors fail closed. Existing full-plan quotas and bounded provider tokens/retries still apply. Reopening cached results does not start new provider work. This limits operations, not guaranteed dollars. No billing limits, purchases or paid services are added.

## Consolidated subsequent approval: A and B

Only after both personal applications and administrator approvals exist:

A. Authorize exactly one invitation per approved recipient from MealCaddie Beta <beta@mealcaddie.app>, reply-to beta@mealcaddie.app, subject Your invitation to the MealCaddie beta. No administrator, signup/login, acknowledgement, resend or marketing email. Recheck provider headroom (at least 20 remaining), cohorts, accounts and absence of conflicting invitations. Enable shared program onboarding and the bounded delivery window using audited administration; enable the branch delivery gate; populate exactly two consent addresses and two newly queued invitation IDs. Run at most two operator deliveries, then close sending gates. Issue tokens only at that approved stage; persist only hashes. Manually reconcile Resend statuses; accepted is not delivered. Stop on unknown, bounce or complaint without sending an extra message.

B. Authorize the scoped branch entitlement gate and shared onboarding for verified recipient-initiated acceptance. Recipients open their own preview invitation, sign in if needed, reopen the invitation, read terms/privacy and explicitly accept. Optional analytics may remain off. Server/database independently verify approved cohort, consent, UUID/email, delivery, single use, seven-day expiry and program boundary. Proton receives Free participation; Rachel receives temporary Plus. No payment or subscription is created. Queued Plus operations revalidate permissions and expiry/revocation preserves content and legitimate paid Plus.

Shared onboarding is unavoidable for issuance/acceptance and requires explicit approval. Rachel's active grant may permit production database pantry writes and vault saves above five regardless of hostname. Production UI/API behavior still depends on its existing code. This disclosed shared-storage effect does not modify Stripe or her stored Free plan.

## Verification and restoration

Disposable PostgreSQL journeys exercise normal intake, duplicate preservation, explicit admin review, Free/temporary Plus acceptance, feedback without analytics, expiry and preservation. Auth/Turnstile/provider responses are mocked in those journeys; these are not live email tests. Existing suites exercise replay, wrong recipients, concurrency, resend/revocation, ownership and paid Plus preservation. Local tests use no shared credentials.

For readiness failure, disable branch intake/AI/onboarding gates and redeploy Preview only; sending/entitlements remain false. No shared rollback or content deletion is authorized. A later approved pilot stop must close acceptance/delivery and use authorized audited revocation: disabling a preview gate alone does not revoke database grants. Full NVDA, VoiceOver, TalkBack and physical-device checks remain separate launch gates. Preserve SMTP, redirect protections and 2/hour authentication rate.
