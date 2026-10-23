# Controlled hosted Auth preparation — hosted activation not executed

This reviewed preparation is published on `feature/auth-onboarding-integration` in draft PR #13 with a protected Preview. Publication does not apply either migration, attach an Auth hook or enable password/setup endpoints. PR #12's approved design and PR #9 are untouched. Existing integration/regression evidence is reused. No customer record, hosted flag, Auth setting, migration or email was changed.

## Preferred hosted test: separate disposable project

The October 22 project-list inspection found only SmartCart production and DealCaddie production in the two visible organizations; neither is disposable. No suitable existing hosted test project was found. Both organizations are Free. Supabase permits two active Free projects across organizations, so a third active project requires an approved paid arrangement. Prefer a separate test-only Pro organization/project (published baseline $25/month with one Micro project within included compute credit), keeping both production organizations unchanged. No provisioning, payment or upgrade is authorized by Preview publication. See [billing FAQ](https://supabase.com/docs/guides/platform/billing-faq) and [pricing](https://supabase.com/pricing); confirm checkout cost and spend controls before purchase.

After separate approval, initialize only versioned application schema dependencies and synthetic fixtures in that project: never clone production data, users, credentials or secrets. Use a dedicated branch-scoped Preview configuration and test-only service credentials, dedicated narrowly scoped SMTP credential and exact recipient restrictions. Attach the reviewed hook only there. The existing production project, redirects, SMTP and domain mapping stay unchanged.

The exact branch Preview hostname needs a narrowly scoped non-production code-origin allowance plus the isolated project's exact Site URL/redirect; it is deliberately not accepted by the current build. That small follow-up must be verified before enabling test flags. No wildcard redirects, domain rebinding or production origin changes. A normal, owner-operated Google test account must first exist in the isolated project to verify returning-Google compatibility; bootstrap it only under the separately approved isolated setup, then attach the hook before adversarial new-account tests. This does not implement new-user Google/OTP enrollment.

Keep the test project's Auth email ceiling at 2/hour and allow at least two rate windows for confirmation/recovery and any legitimate bootstrap traffic. Four planned messages include application notification and invitation as well as two Auth messages; provider quotas and rate-window headroom are checked before each approved send. Never retry uncertain delivery blindly. Private identities, exact message budget and the consolidated future approval are outside Git.

The shared-project window below is an **unselected fallback**, not permission to rebind domains or change shared Auth. Its interruption of new Google/OTP enrollment is why isolation is preferred.

## Targeted final review

Target: Supabase project `mwxvorzrausbnqzjrhqm` (SmartCart). A narrowly scoped `BEGIN READ ONLY` dashboard check confirmed PostgreSQL **17.6**, Auth users, beta applications/invitations, `beta_verified_user(uuid)`, `supabase_auth_admin`, and service-role execute access to the verified-user function. All three lookup tables have RLS enabled. Both candidate migration history entries and their new table/schema are absent. Latest recorded migration is `20261019045435_pantry_quantity_accounting`.

Program: onboarding enabled; **invitation delivery disabled**; 30 participation days; not ended; cap `2027-01-01T05:59:00Z` = December 31, 2026, 11:59 PM America/Chicago. **Zero current issued, unexpired, unbound invitations** were found. Recheck this immediately before a shared Auth switch; do not strand another approved new recipient.

| Exact unapplied migration | Reviewed SHA-256 |
|---|---|
| `20261022210035_account_username_directory.sql` | `7cc33223316e2d303ffa49a1a7a3108912502e08c20ccb63ff290ec80bcf482f` |
| `20261023014114_invitation_only_auth_hook.sql` | `6c2623b45607851a0d8727fa74102522e4522e2a0e6803a8b0966670dcb7a2db` |

The username checksum **supersedes** PR #13's previous `8a0dcdc1…` candidate: one necessary correction explicitly revokes service-role table privileges before granting SELECT/INSERT, so broad Supabase default ACLs cannot silently retain UPDATE/DELETE/TRUNCATE. No user backfill or profile/plan change. Unique immutable aliases, verified-owner dependency, browser-deny RLS, empty search paths, service-only RPC and 5s lock/30s statement timeouts remain.

The second migration creates an unexposed `mealcaddie_auth` schema, a transient hashed-permit table, a shared eligibility lookup, two service-only permit RPCs and one Auth-only Before User Created function. It does **not** attach the hook. Its only existing-table additions are narrow SELECT column grants and SELECT policies for trusted `supabase_auth_admin` on program/application/invitation eligibility data. No questionnaire responses, content, subscriptions or profiles are granted to that role. All functions are SECURITY INVOKER; no new SECURITY DEFINER function or HTTP callback. Existing browser denials remain.

Fresh execution preflight must also record exact prior Auth-role column grants/policies and confirm all new function/policy/schema names are unused. Apply only these two named/checksummed files, in order, each once; never generic `db push`. Recheck the reviewed UTF-8/LF bytes and history at execution and use bounded transactions. The UTC date in the hook migration filename is intentional.

## Provider-level enforcement

Configure **Before User Created → PostgreSQL**:
`pg-functions://postgres/mealcaddie_auth/before_user_created`.

Supabase supports this hook on Free/Pro and invokes it before new-user insertion. It does not run for ordinary existing-user sign-in/refresh/recovery. Sources: [Before User Created](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), [hook permissions and availability](https://supabase.com/docs/guides/auth/auth-hooks).

The server first verifies the encrypted invitation-return cookie, exact recipient and current eligibility, then generates a cryptographically random 32-byte permit. The service-only RPC stores only its SHA-256, invitation ID, email and **two-minute** expiry. The raw permit goes privately to Supabase in `user_metadata.account_signup_permit`; the hook treats it as untrusted input and permits creation only after an atomic single-use delete matches its hash/email and independently rechecks the current invitation/program/consent/cohort. No role, plan, provider or `approved=true` metadata flag authorizes signup. Knowing an invited email alone is insufficient.

Successful creation leaves only a **spent, non-authoritative** permit receipt in Auth metadata, not the invitation token or a reusable credential. The server attempts permit deletion in `finally` on success/failure. Interrupted cleanup cannot extend its DB expiry. No passphrase, production signing secret, password table or paid service is added. Any expired residue is manually purged after 24 hours by an approved service-role maintenance action; no cron is enabled here. Do not log raw signup payloads, permits, passwords or tokens.

**Compatibility boundary:** the strict permit hook covers *all* new Auth accounts. Existing Google/email/password users keep their UUID and sign-in methods. This bounded pilot supports new password registration through the updated Preview; **new-account Google or legacy direct-OTP signup has no permit and is denied**, even if an invitation email exists. Do not claim those new-user flows are implemented. No unrelated approved unbound invitations may be outstanding at activation, and no others may be issued during the test window. If that condition fails, stop: use a separately approved isolated hosted project, or separately review compatible new-Google/OTP enrollment before shared activation. Do not weaken the hook to an email allowlist.

This is a controlled password-pilot proposal, not approval for general authentication rollout. Invitation acceptance still independently requires matching verified email, any bound UUID, the personal token, explicit consent and available cohort capacity. Signup or onboarding never grants product access.

## Origin and flags

Fresh Vercel read: `preview.mealcaddie.app` is valid and bound to **feature/beta-onboarding**. Preserve that mapping. Only if the shared-project fallback is separately selected and approved would a temporary reassignment during an owner-controlled maintenance window be considered, restoring the original branch/deployment afterward. No DNS edit, production-domain change or wildcard redirect is needed.

Use exactly `https://preview.mealcaddie.app` as the application origin and `https://preview.mealcaddie.app/` for registration confirmation, recovery and Google return. Fresh dashboard reading confirmed this exact redirect among eight existing entries, Site URL `https://mealcaddie.app`, and no configured Auth hook. Paths `/beta/accept`, `/account/onboarding`, `/planner` and `/auth/reset` are same-origin in-app destinations, not additional Supabase redirect entries. Preserve production `https://mealcaddie.app/` and every existing redirect. Keep Google provider callback `https://mwxvorzrausbnqzjrhqm.supabase.co/auth/v1/callback`. The branch-specific Vercel URL stays outside the Auth allowlist.

After separate approval: publish the reviewed permit handoff, apply migrations/attach hook, confirm email verification, then set `ACCOUNT_EXPERIENCE_ENABLED=true` **only for feature/auth-onboarding-integration Preview** and redeploy that protected Preview. Preserve `BETA_ONBOARDING_ENABLED=true`, existing product access policy, billing and allergy gates. Do not set `ACCOUNT_EXPERIENCE_RELEASE_APPROVED` in Production or change Production flags. Leave Preview public applications and invitation sending off; the normal existing intake and one recipient-restricted owner-assisted sender are used separately under explicit approval.

Keep Vercel Authentication and existing team membership unchanged. Keep Supabase email capacity **2/hour**, OTP/session/security settings and all email bodies/subjects unchanged. Fresh provider-screen inspection confirmed new-user signup and email confirmation ON, anonymous sign-in/manual linking OFF, and Email/Google enabled. Attach/verify the deny-by-default hook before beginning tests; do not toggle the already-enabled signup switch to widen access. If any existing Before User Created hook appears at execution, stop and review composition; never overwrite it silently.

## Focused evidence

- 19 targeted account/permit/migration checks passed (16 affected existing tests + 3 new database checks), plus one focused permit-handoff assertion run. TypeScript and focused server-file lint passed. No build/full-suite/browser/backup rehearsal repeated.
- Includes single-use replay rejection, wrong email, guessed/missing proof, spoofed roles/metadata, expiry, 16 invalid invitation/program/permit states, post-issuance revocation, browser RPC denial, default-ACL tightening, verified alias claim, unchanged stored plans/user counts, no participation creation by the hook and fail-closed permission loss.
- Actual Supabase hook invocation, existing Google sign-in with the shared hook and mail delivery remain **unexecuted hosted approval gates**, not proven by SQL simulation.

## Fail-closed rollback and retention

Record prior hook/registration settings, templates/subjects, exact redirect list, rate/OTP/session settings, Preview flags and domain branch/deployment before any change. On error: stop sends/requests; turn off Preview account feature; stop new signup with Supabase's new-user-signup switch if needed while retaining existing sign-ins. Keep the strict hook attached or leave new signup disabled. Do not automatically restore unrestricted registration by disabling the hook while signup is open.

Restore the prior Preview domain mapping and flag values; do not touch Production aliases, SMTP, existing accounts, subscriptions, sessions or content. Restore prior Auth settings only within reviewed bounds; reopening unrestricted signup requires a separate decision. Keep populated username mappings. No automatic account/table deletion or destructive schema rollback. Restore only newly added grant/policy differences from their captured baseline. A later empty-object schema removal requires approval after hook detachment and proof it cannot reopen access.

The hosted run must allow only the named synthetic identities, a Free test cohort, no AI calls, no analytics consent and a fixed email ceiling. New test participation may be withdrawn/revoked through the normal test-owner workflow after verification, preserving its account/content and audit evidence. No changes to existing Plus/admin/pilot records. Private recipients, exact message counts and the step-by-step approval scope are in the separate local approval package, not GitHub.
