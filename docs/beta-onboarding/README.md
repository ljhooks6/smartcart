# Phase 3 controlled implementation

Branch: `feature/beta-onboarding`, based on Phase 1/2 `feature/beta-recruitment` at `30ec638`. Its draft PR must target that development branch. PR #1 remains unmerged. Existing application, administrator, review, quota, storage and billing infrastructure is reused; no Phase 1 objects are duplicated.

## Implemented architecture

- Approval reserves a Free/Plus cohort seat. Only verified administrators can queue invitations. Reserve candidates cannot activate.
- The delivery worker creates a 256-bit token, persists only SHA-256, uses a per-invitation idempotency key, serializes claims, paces at least five seconds apart and limits daily waves (default 15, configurable 1–45). Queued work is not an issued invitation. Issuance begins the seven-day expiry.
- No automatic scheduler or public send endpoint is installed. Sending requires application and database gates, an explicitly reviewed HTTPS origin, a same-day provider-capacity review and at least 20 messages of declared headroom. Unknown outcomes stop for administrator reconciliation; they never automatically resend. Provider accepted and delivered are separate states.
- Signed, timestamp-bounded Resend callbacks verify the raw body, deduplicate event IDs, and ignore unrelated messages. Late successful callbacks cannot erase complaints/bounces. The callback route defaults disabled; no live webhook was registered.
- Resends revoke older live links, require 24 hours, and allow at most three resends per rolling seven days. Revocation is explicit and audited.
- Acceptors sign in with the verified recipient address, reopen the email, review privacy and accept. Existing verified identities bind by UUID at issuance; new accounts must verify the exact recipient email. No automatic account merging or email alias stripping. Anonymous, unverified, mismatched or ambiguous identities fail closed. Concurrent acceptance makes one participation. Same-owner repeat acceptance returns the existing result, never another grant.
- Participation is a separate 30-day Free/Plus record, capped by the configured program boundary. Promotion preserves expiry; extension is separate, justified and bounded. Revocation/withdrawal stops temporary privileges immediately. Ending the program also removes temporary authorization. There is no payment-information or subscription step.
- Server membership and database pantry/vault guards consult the same current grant. Paid baseline Plus remains authoritative. Account/billing display remains separate from feature access. Expired Plus jobs stop before provider execution and release the unused existing quota reservation; saved recipes, pantry and menus remain.
- Accessible feedback supports bugs, suggestions and usability reports, with retry deduplication and private admin notes/statuses. Participants can see only their own recent submissions; analytics is unnecessary. Private administration reviews delivery, participants, promotion/extension/revocation, feedback and minimal counts.
- Optional analytics starts off and records only successful plan/feedback action counts, never meals, ingredients, prompts, IPs or device fingerprints. Turning it off clears prior beta analytics. Raw events retain 30 days; feedback/aggregates retain 90 days after program end. Existing withdrawal cleanup removes linked beta records sooner. Application audit and delivery records inherit Phase 1 application retention; general program audit retains its existing 180-day policy.

## Safe verification environment

Only the existing unlinked `mealcaddie-auth-isolated` lab is used: API `127.0.0.1:54321`, PostgreSQL `127.0.0.1:54322`, local mail sink. All test identities use `example.invalid`. Local scripts reject remote hosts and inspect loopback port binding. No customer content, production keys, Resend credential, live email, invitation or AI request is needed. Synthetic transport acknowledgements are not evidence of real delivery.

`scripts/phase3-local-migration-rehearsal.mjs` verifies exact SQL, restores the original storage helper through the empty-only rollback, reapplies the final migration and compares account/subscription/vault/pantry/menu fingerprints. `scripts/phase3-local-journeys.mjs` tests actual local Auth, independent PostgreSQL connections and REST authorization. It creates ignored local state/config only. `scripts/phase3-local-api-check.mjs` uses those disposable sessions against port 3002. These integration scripts require the existing sibling `work/local-test-tools` installation of `pg`; the regular regression suite uses the repository's PGlite dependency.

Browser evidence: keyboard acceptance/replay and feedback submission without analytics; labelled forms, status announcements, 390px and 320px layout checks. Physical devices and full NVDA/VoiceOver/TalkBack testing remain independent launch gates. Prior Phase 1 phone approval does not certify the new Phase 3 flows.

## Preview and release boundaries

The protected Vercel code preview shows disabled review pages at `/beta/accept`, `/beta/participant`, `/admin/beta/onboarding`. It does not connect the new features to the shared database: all new flags default off. Full database-backed journeys run locally. Keep `preview.mealcaddie.app` on Phase 1; no DNS or redirect allowlist changes are made for this work.

Approval is separately needed for: the exact shared migration; preview-only program/entitlement configuration; any new exact auth redirect; a signed provider callback ingress; any sending worker/scheduler and real message/wave; any 2→30/hour auth limit change; production code release and recruitment. No reviewed approval for one of these activates another.

## Remaining launch gates

- Final privacy/legal review of the participation notice, optional analytics, retention/deletion and processors; verify support and beta inboxes, withdrawal/data-request handling, incident contact and privacy version.
- Configure explicit program end/boundary and verify extension policy. Review quotas/costs including beta Plus AI usage; no new subscriptions are required.
- Review signed webhook reachability: Vercel Authentication blocks provider callbacks to a protected preview. Do not remove whole-preview protection; approve a narrow authenticated callback design separately or retain manual provider reconciliation for controlled tests.
- Measure normal production SMTP traffic and remaining daily/monthly provider quota before each wave. Pause on uncertain delivery, authentication throttling, bounce/complaint, quota errors or unexpected grant/account change.
- Physical iOS/Safari and Android/Chrome: sign in then reopen invitation, keyboard, scrolling, rotation, text size, sticky navigation and feedback. Separate NVDA/Firefox or Chrome, VoiceOver/Safari and TalkBack/Chrome runs: headings/landmarks, labels, focus order/visibility, validation/error and status announcements, consent, native selects, account change, privacy navigation and withdrawal.
- Verify 200%/400% zoom, text contrast, touch targets, reduced motion, no horizontal overflow and no keyboard trap. Automated/browser inspection is not a screen-reader certification.
- Admin lists currently bound to 100 latest records; engagement to 200 daily rows. Review paging/export before expanding beyond the controlled first cohort or accumulating a larger feedback backlog.
- Fresh shared read-only baseline, exact SQL approval, controlled rollout/rollback review and live no-email authorization checks before any activation. Preserve Stripe, guest access and the Formspree Plus waitlist throughout.
