# MealCaddie Phase 2 review pack

Authentication preparation and the onboarding designs are complete. Shared SMTP and authentication templates remain unchanged. No email, invitation, new account, entitlement, subscription change, DNS change or production deployment occurred in this stage.

## Review documents

- [Authentication audit](phase2-authentication-audit.md): active flows, inspected settings, exact redirects, profile triggers, permissions and all plan restrictions.
- [SMTP setup, controlled tests and rollback](phase2-smtp-and-rollback-plan.md): exact Resend settings, credentials handling, ordered approval gates and rollback prerequisites.
- [Six branded email drafts](../../supabase/auth-templates/README.md), [subjects/variables](../../supabase/auth-templates/manifest.json) and an offline gallery in the owner review pack: HTML and plain-text review companions. Only confirmation and magic-link are candidates for the initial switch.
- [Invitation, temporary Plus and feedback architecture](phase2-beta-onboarding-design.md): design only, with acceptance criteria for future migrations and tests.
- Readable original-template baseline in the owner review pack: incomplete as a rollback backup; owner export is required before switching.

## Findings that affect the next stage

1. Google requests the current environment, but the active email handler omits emailRedirectTo and can return preview users to production. Prepare an exact-origin fix and regression tests separately before shared SMTP testing.
2. Paid/profile Plus is server-authorized and plan/beta_status columns cannot be updated by ordinary authenticated clients. However, Plus pantry persistence and the Free five-meal vault cap are UI-only. Direct own-row writes bypass those feature limits. Fix database/server enforcement before temporary entitlements launch; preserve existing content.
3. Auth account creation remains open. Invitation-only beta participation must not close existing account signup or guest access. Account invitations are not beta invitations.
4. One legacy account-creation SECURITY DEFINER function has no fixed search_path. Audit dependencies and prepare a narrow hardening migration before public launch. No trigger was changed here.
5. There is a stale redirect entry without a scheme. Removing it needs separate approval and must not widen the allowlist.
6. Custom SMTP is disabled. A dedicated sending-only, domain-scoped Resend key is supported. The application-mail key need not be reused. auth@ receiving and domain tracking settings still require verification/configuration.
7. A complete rollback export and isolated restoration rehearsal remain prerequisites. Two existing template subjects were browser-redacted; the readable baseline must not be substituted for a complete export.

## Checks actually performed

| Check | Result / evidence |
|---|---|
| Full automated suite | **117 passed, zero failures/skips**: the existing 105 plus eight auth-template checks and four Stripe webhook regressions. |
| Authentication regression | Existing membership/route/checkout tests cover invalid sessions, forged plans, lookup failures and verified-user ownership. No new password or email flow was enabled. |
| Supabase security | Existing isolated PostgreSQL/RLS tests rerun. Live read-only check confirms browser roles cannot UPDATE profile plan or beta_status. |
| Account/subscription preservation | Auth users remain 3; sorted profile digest `cf4b7539f8cc7141f69eca90a80568fd`, subscription digest `d751713988987e9331980363e24189ce`, unchanged from Phase 1. |
| Stripe regression | Mocked signature failure prevents writes; active/trialing/past_due preserve Plus; canceled/incomplete preserve Free; missing identity does not grant a plan; write failure does not continue. No Stripe API traffic. |
| Production build | Passed; includes lint and TypeScript checks. No deployment performed by this check. |
| Template contracts | All six preserve required variables and auth links; no scripts, forms, external images, tracking or SmartCart copy; four dormant flows remain marked dormant. |
| Template mobile render | All six rendered in Chrome at 320px and 600px without horizontal overflow, 16px body text and one primary heading. Five verification CTAs exceed 44px height. Measured results are saved in the owner review pack. |
| Accessibility | Normal-text contrast tests meet 4.5:1; underlined links, presentation tables and language/heading semantics checked; login CTA keyboard focus has a visible browser outline. 320px proof is saved in the owner review pack. |
| OAuth/redirect review | Live exact allowlist inspected; Google handler reviewed for current-origin redirect. This stage did not repeat interactive logins or send magic-link mail. Phase 1 owner Google preview sign-in had passed. |
| Invitation/entitlement review | Threats, transactional races, expiry, identity binding and paid-plan precedence documented. No implementation exists to claim end-to-end tests. |
| Reply routing | Owner reports incoming reply routing manually verified after Phase 1. This is owner evidence, not a new agent test. |

Build warnings: stale Browserslist compatibility data and a local queue-region fallback. Tests also retain the existing module-type warning. These did not fail validation; dependency updates are a separate reviewed task.

## Pending tests and configuration

- Actual Supabase-issued branded auth email delivery, HTML/plain-text MIME, SPF/DKIM/DMARC results, inbox/spam placement, receiving auth@ alias and tracking behavior.
- Production and preview Google/email sign-in with approved controlled accounts after the redirect fix and SMTP switch; approved new-account confirmation.
- Auth-link expiration/reuse, mail-scanner behavior and full SMTP/template restoration drill in an isolated mail sink. Docker and Supabase CLI were not available in the current PATH; none was installed or started. Approve isolation setup first, or choose a separately approved nonproduction project.
- Proton/Gmail/Outlook and physical-phone rendering of the new mail, and a full screen-reader pass. Browser reflow is not an email-client or assistive-technology certification. Prior owner phone testing covered the beta web form only.
- Future invitation/RLS/concurrency tests, temporary entitlement tests and feedback tests described in the design. Do not activate those systems based on design review alone.

## Additional cost estimate

| Item | Starting estimate |
|---|---|
| This preparation | $0 additional subscriptions or sending charges; no email sent. |
| Resend authentication | Potentially $0 within existing Free allowance: 3,000 transactional messages/month and 100/day shared across keys. Example estimate: 45 active testers × 2 logins/week × 4 weeks = 360 auth messages; 45 invitations + 45 welcome messages + 50 acknowledgements = approximately 500/month. This is a planning scenario, not an approved send schedule. |
| Resend upgrade if needed | Pro currently $20/month for 50,000 messages, no daily cap, extra messages $0.90/1,000. Not required or purchased in this stage. |
| Supabase | Branding with custom SMTP does not itself require Pro. Current Free allowance may accommodate the small beta, but production reliability/backups need review. Pro starts at $25/month; additional projects start at $10/month. No upgrade or project created. |
| Feedback | Reuse existing app/database/admin; no survey subscription proposed. |
| Temporary Plus AI | Additional usage of existing paid AI APIs is expected when grants are eventually enabled. Keep the existing limits, measure per-operation spending and set owner-approved budget alerts before activating. No new model or dollar forecast is asserted without usage measurements. |

Prices verified against [Resend pricing](https://resend.com/pricing) and [Supabase pricing](https://supabase.com/pricing). Resend inbound usage also counts if received through Resend; current Cloudflare forwarding is separate. Preserve headroom for production users: activating 45 testers at once could consume most of the daily email limit. A future phased invitation schedule of around 15/day is safer, subject to measured usage and approval. Vercel commercial-use plan suitability remains a separate production-readiness decision; this work creates no paid Vercel subscription.

## Exact approvals needed, in order

1. **Preparation:** approve `MealCaddie <auth@mealcaddie.app>`, the six draft subjects/bodies (only two active initially), a dedicated sending-only Resend key restricted to mealcaddie.app, receiving auth@ forwarding and inspection of domain tracking. Credential creation/entry stays private. No provider switch or email send is included.
2. **Redirect fix and hardening:** approve preparation of an exact-origin emailRedirectTo fix plus tests; separately review any allowlist cleanup, trigger hardening and pantry/vault enforcement migration. These are concrete findings, not changes already applied.
3. **Isolated validation:** approve a local mail-sink setup using only synthetic accounts, or a named nonproduction Supabase project with an approved cost limit. Export complete originals and rehearse rollback first.
4. **Shared SMTP switch:** after the rehearsal succeeds, approve the exact Supabase SMTP settings, initial 30 auth emails/hour limit, the two active templates, a scheduled monitored window and an explicitly bounded controlled-recipient email test. This needs a new approval; neither Phase 1's consumed single-message approval nor approval of these drafts permits sending.
5. **Future beta implementation:** approve the invitation architecture/defaults (seven-day expiry, 24-hour resend cooldown, three resends/week), separate temporary Plus grants (proposed 30 days, program-end cap), consistent server/database enforcement and minimal feedback collection/retention. Migrations need their own review/application approval. Implementation approval does not enable invitations or production launch.

Privacy review remains provisional: confirm operator/jurisdictions/age policy, processor disclosures, retention justifications, withdrawal identity verification and backup/deletion handling. Keep support@ as the privacy contact and marketing consent separate. Add authentication delivery and invitation-token provider retention to the final notice; do not collect passwords or auth links in support requests.

PR #1 remains draft on feature/beta-recruitment. Public recruitment, invitations, complimentary grants and shared SMTP are disabled. Production/main, subscriptions, existing accounts, guest access and Formspree are preserved. No public-launch approval is requested yet.
