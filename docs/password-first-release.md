# Password-first coordinated release

Owner approved PR #12 followed by PR #13, the two reviewed additive migrations, provider hook and required production flags. The owner explicitly declined the hosted rehearsal; actual registration/confirmation/recovery delivery remains unverified. No test accounts or emails are permitted in smoke checks. Recruitment/campaign activation remains separate.

## Enrollment contract

New invited testers use username, recipient email and password, verify the email, reopen/return to the personal invitation and explicitly accept. Existing Google/email-link/password users retain their established method and identity; they must not create replacement accounts. Google and OTP do not create new accounts in this release. The strict provider hook denies any new account lacking a current server-backed, recipient-bound single-use permit. No email-only allowlist or caller-provided role/plan/approval flag is trusted.

Invitation controls preserve the encrypted return context before routing to registration or sign-in. Registration never consumes the invitation or activates participation. Wrong-recipient/consent/expired/revoked guards remain server enforced. Provider failures produce generic, actionable guidance without exposing account existence or reflecting provider descriptions/tokens.

## Exact migrations, prerequisites and order

Target `mwxvorzrausbnqzjrhqm` / SmartCart / postgres. Reviewed dependencies: Auth users and role, beta eligibility tables and verified-user function, service execute, expected RLS. Fresh history/object/ACL checks must pass. Apply only:

1. `20261022210035_account_username_directory.sql` — SHA-256 `7cc33223316e2d303ffa49a1a7a3108912502e08c20ccb63ff290ec80bcf482f`.
2. `20261023014114_invitation_only_auth_hook.sql` — SHA-256 `6c2623b45607851a0d8727fa74102522e4522e2a0e6803a8b0966670dcb7a2db`.

Bounded transactions with 5s lock/30s statement limits, exact SQL/hash guards and same-transaction matching history entry. No generic db push, backfill or bundled migrations. Record non-sensitive counts/fingerprints for users/profiles/subscriptions, pantry, weeks, Vault, invitations and participation. Verify unchanged afterward; require exact new object definitions/ACL/RLS/history and empty new tables. No real user is created for verification. Preserve all existing mappings/content on failure; do not automatically drop populated schema.

## Coordinated activation

Reconfirm exact PR #12 head and main baseline before merge. Deploy PR #12 first, verify READY/correct commit, then retarget/integrate stacked PR #13 onto updated main without losing PR #12 design, verify its combined diff and checks, and deploy PR #13. Keep account production flags OFF until migration and hook prerequisites pass. Install Before User Created PostgreSQL URI `pg-functions://postgres/mealcaddie_auth/before_user_created`; confirm no preexisting hook is overwritten. Preserve mandatory email confirmation, existing Email/Google providers, no anonymous/manual-linking changes, SMTP/templates, OTP/session settings and 2 Auth emails/hour.

Production callback origin remains exactly `https://mealcaddie.app/`; Google provider callback remains `https://mwxvorzrausbnqzjrhqm.supabase.co/auth/v1/callback`. Existing redirect entries remain unchanged; no wildcard, Preview-domain rebind or branch hostname addition. Only after hook validation enable `ACCOUNT_EXPERIENCE_ENABLED=true` and `ACCOUNT_EXPERIENCE_RELEASE_APPROVED=true` in Production and build/deploy that configuration. Existing onboarding/access/entitlement flags remain at their recorded production values; do not enable invitation delivery, AI, checkout, legal enforcement or public submissions as a side effect.

The focused configuration read found Production `BETA_APPLICATIONS_ENABLED=true`. This release must set it false to keep recruitment separate. PR #13 now decouples approved public-page visibility from submission enablement, while keeping all existing publication/privacy/contact approval gates. The API still rejects closed submissions before Turnstile/storage/email. During PR #12's intermediate deployment the older coupled `/beta` gate can remain closed; the public home shows closed status. PR #13 restores `/beta` as an approved readable page with submissions closed. Preserve existing beta participants, pending invitations and delivery-OFF DB state. No broad background sender or test transport runs. Reopening submissions later requires separate owner approval.

## Fail-closed rollback

On migration or deployment failure stop subsequent activation. Abort any uncommitted SQL transaction. On Auth/hook failure stop new requests, disable account feature flags; disable NEW signup before any hook detachment if required, without revoking existing sessions or sign-in methods. Do not restore unrestricted signup merely by detaching the hook while signup stays ON. Restore only approved config differences; no key rotations, account deletion, billing or content writes. Leave applied additive schema and mappings intact pending separately approved cleanup. Retain the known-safe production deployment if the next deployment fails; no destructive database rollback.

## Focused evidence and smoke limits

33 relevant checks passed across account, provider permits/RLS, invitation UX, redirects and new rendered password-first screens/routing. An older invitation harness needed its missing personalization mock; its seven tests pass after that test-only correction. TypeScript and focused lint passed. React review: explicit buttons, existing focus/error regions, mobile-sized controls, no new fetching effects or dependencies. Previous optimized build/mobile/regression evidence reused; Vercel validates the new build.

Post-release check landing, offline guest screens, supported-method copy, disabled submissions, protected setup/password configuration, unauthenticated owner/admin denial and accessible existing planner/pantry/Shop/Vault routes. No account creation, authentication email, consent acceptance on another's behalf, AI call or customer-content mutation. Hosted end-to-end confirmation/recovery and full screen-reader/physical-device checks remain limitations; do not report them as passed.
