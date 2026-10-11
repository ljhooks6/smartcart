# Resend SMTP configuration and controlled rollback

Review only. Shared authentication settings remain unchanged. This supersedes earlier Phase 1 sender proposals. A switch affects production and preview because they share one Supabase Auth project.

## Exact proposed configuration

| Supabase → Authentication → Emails → SMTP Settings | Proposed value |
|---|---|
| Enable custom SMTP | On, only at the separately approved switch |
| Sender email | auth@mealcaddie.app |
| Sender name | MealCaddie |
| Host | smtp.resend.com |
| Port | 465 |
| Encryption | Implicit SSL/TLS; port 587 with STARTTLS is an alternative, not the primary proposal |
| Username | resend |
| Password | A new dedicated Resend API key, entered privately by the owner |
| Key name/permissions | MealCaddie Supabase Auth; Sending access; restricted to the verified mealcaddie.app domain |
| Rate limits | Keep existing per-IP limits. After recording the current email limit, propose 30 auth emails/hour initially, subject to explicit approval and shared Resend quota monitoring. |

Verified against [Resend Supabase SMTP setup](https://resend.com/docs/send-with-supabase-smtp), [SMTP transport documentation](https://resend.com/docs/send-with-smtp) and [API key isolation and domain restrictions](https://resend.com/docs/dashboard/api-keys/introduction). Resend uses an API key as the SMTP credential; a separate key is supported, not a separate SMTP-only password. Domain restriction does not restrict the key to one recipient or one sender local-part. Keep it out of Vercel, client code and the repository. Do not reuse or rotate the working application-mail key.

Default custom-SMTP Supabase email throttling is 30/hour; the built-in service has narrow team-recipient restrictions and a 2/hour default and is unsuitable as a public-beta fallback. See [Supabase SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp). Resend currently documents 10 API requests/second per team, shared across keys; SMTP shares its sending limits. Check the actual account allocation before switching ([Resend rate limits](https://resend.com/docs/api-reference/rate-limit)). Separate keys do not create separate quotas.

auth@ forwarding is not yet verified. Prepare an owner-approved Cloudflare forwarding alias to the existing inbox without changing MX or production website records. Native Supabase SMTP fields do not establish a custom Reply-To here; use the receiving auth@ alias and support link unless a supported setting is explicitly verified. The owner reports beta/support incoming routing worked; that does not prove auth@ delivery. Disable click/open tracking for authentication messages, but first inspect Resend's existing domain configuration and obtain approval for any setting affecting other mail. Never rewrite ConfirmationURL. See [Supabase template security guidance](https://supabase.com/docs/guides/auth/auth-email-templates).

## Code preparation versus shared configuration

Prepared in the feature branch: six HTML drafts, six plain-text review companions, subjects/variable manifest, offline review fixtures and regression tests. They are not wired into an automatic deployment or config mutation. Initially use only confirmation and magic-link drafts. Dormant drafts cannot enable missing application flows. Supabase offers body/subject fields, not a separate TXT field in this workflow; inspect delivered MIME before asserting a full plain-text alternative.

Supabase settings, SMTP credential entry and template saves are owner-approved shared configuration. Resend key creation, tracking changes and auth@ forwarding also need explicit approval. No extra NEXT_PUBLIC variable or Vercel API key is needed. The separately proposed emailRedirectTo fix would be application code with its own preview regression and production rollout approval. Leave Site URL, Google callback and all existing sessions unchanged.

## Approval and execution gates

1. Approve sender and dedicated domain-scoped key preparation; owner creates/stores the credential privately. Approve receiving alias and any necessary tracking setting after inspection. No messages at this stage.
2. Before shared changes, owner exports the exact current six subjects/bodies and SMTP enabled state into a private rollback bundle. The existing readable baseline is incomplete and must not be used as a byte-exact backup. Capture safe provider/rate settings; never put credential values in the review pack.
3. Rehearse settings and template restoration in an isolated local Supabase mail-sink setup or separately approved nonproduction project using synthetic accounts. Do not clone production auth users/keys. Docker/Supabase CLI availability and mail-sink setup must be confirmed first. If isolation cannot be completed, report the blocker; do not declare rollback tested.
4. Obtain separate approval for a scheduled shared SMTP switch, the two active templates, an exact controlled-recipient send budget, and the monitored rollback window. Password/credential entry in the browser is an owner handoff. Keep invitations and recruitment off.
5. Record account/profile/subscription counts and keyed or sorted-row digests before/after; verify unchanged existing accounts and rows. New approved synthetic-account tests are the only intentional count difference and must be enumerated. Preserve guest access and Formspree.
6. Save SMTP, send one approved existing-account magic-link message, inspect redacted delivery metadata and verify current environment, then test confirmation with a separately approved new test account. Stop on failures. No broad testing mail or unsolicited new accounts.

## Controlled test matrix (not executed against new SMTP)

| Case | Method and expected result |
|---|---|
| Google existing user | Owner signs in normally on both domains; same UUID/profile, no duplicate row, correct origin. Do not invalidate other sessions. |
| Email existing user | Approved controlled inbox on production and preview; same UUID. Current missing redirect is a known preview blocker until its reviewed fix is deployed. |
| New account confirmation | Approved new owner-controlled identity; email confirmed, one Free profile, existing accounts untouched. Explicit test-account creation approval required. |
| Recovery/email change | Not active in app; render drafts offline. Do not reset a real password or change the owner's email. Test only after a separately approved implementation. |
| Single-use/expiration | In isolated mail sink, use real Supabase-issued test links once and again; deny reuse. Test expired link without shortening shared production expiry. No token screenshots/logs. |
| Unapproved redirect | Isolated test rejects unallowlisted origin; exact approved roots work. Do not widen production allowlist for testing. |
| Delivery | Check sender, SPF/DKIM/DMARC result, inbox/spam, HTML and plain-text MIME, reply alias and no tracking rewrites. Provider delivery is not proof of inbox placement. |
| Mobile/a11y | Offline 320px and 600px layouts, keyboard focus, contrast, semantic headings; then actual Proton/Gmail/Outlook and phone email rendering during approved sends. |
| Scanner behavior | Isolated preview tests for prefetch; GET must not beta-activate. Supabase single-use auth links can be consumed by mail scanners; report before changing the auth flow. |
| Rollback | Rehearse original-template restoration while custom SMTP is on, then prior provider disabled state; login behavior and session preservation rechecked. |

## Rollback runbook

Triggers: authentication delivery failure, wrong environment, changed identity/profile, broken confirmation link, unplanned mail, sustained throttling or inaccessible email.

Stop controlled sends and pause invitation work. Keep Google, existing sessions, guest access and preview protection unchanged. Restore the exact owner-exported original subjects/bodies **while custom SMTP is enabled** (Free-tier customization restrictions may otherwise prevent restoration). Restore original rate settings and SMTP state (currently custom disabled). Do not rotate Supabase signing keys, revoke sessions, delete accounts or alter Site URL. Verify an approved existing-account login and Google login; check identity/row digests and report mail-provider metadata without tokens. Only revoke the dedicated Resend key after it is no longer configured, using separately authorized credential handling. Retain the existing application-mail key. Built-in SMTP is a limited emergency fallback; keep public recruitment closed until reliable delivery returns.

Rollback cannot invalidate messages already delivered. Their existing expiry/single-use semantics remain; report any uncertain messages and do not resend automatically. Record who changed which setting, when and why without retaining secrets. No destructive cleanup of test accounts or real records without separate approval.
