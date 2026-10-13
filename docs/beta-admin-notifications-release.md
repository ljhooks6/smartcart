# Focused application administrator notifications

Review URL: https://mealcaddie.app/admin/beta. The email uses the existing dashboard,
not a token or an invented application-specific route. Signed-out users go through
MealCaddie sign-in and return to the dashboard; data/recovery APIs verify the current
Supabase user and the private administrator table server-side.

From: MealCaddie Beta <beta@mealcaddie.app>. To: support@mealcaddie.app.
Subject: New MealCaddie Beta Application Received.
The email includes only applicant email, Central submission date/time, plan interest
and Pending Review status. No questionnaire answers, notes or invitation tokens.

## Migration requiring separate owner approval

`20261013185630_beta_application_notifications.sql`

SHA-256: `6faba7b81a685b035be942e5596b274bd5e8526317853e7fbe7a0b8173245e94`.

The earlier email ledger permits only historical owner-test claim keys and does not
provide lease/retry states. The current submit RPC returns void. Reusing either as
an improvised send queue would weaken atomic new-application detection or delivery
recovery. This additive migration creates one private outbox table and two service-
only invoker RPCs, and preserves the existing submission function signature/ACLs
while adding one outbox insert inside its successful-new-record transaction.

No historical backfill. Duplicates cannot insert another outbox row. No profile,
subscription, applicant selection, invitation, participation or saved-content
change. Browser roles have neither table permissions nor function execution; RLS
denies browser access as additional protection. No privileged keys in client code.

The outbox holds IDs, bounded states/error codes, attempts, leases and provider IDs,
not email bodies/answers/credentials. It cascades with existing application deletion
and retention procedures. No cleanup schedule or retention period is changed.

## Delivery and recovery

Applications return success independently of background scheduling/provider failure.
The already-used Vercel Queue infrastructure gets an ID-only notification topic;
no new provider subscription, credential or spending limit is needed. Each outbox
claim is locked and leased; concurrent/replayed work cannot resend an accepted email.
Resend uses a stable per-application idempotency key. Only definitive 429 rejections
get automatic retries (five provider attempts maximum). Missing config and known
rejections are recoverable from private administrator controls. Timeouts, malformed
responses, server errors and stale in-flight leases become Uncertain and cannot be
automatically or dashboard-retried. Reconcile them with Resend first. Pending records
survive scheduling failure, bounded queue retry exhaustion and provider outages.

The private dashboard shows the latest 50 notification records and an explicit
recovery action for unsent, known outcomes below the attempt cap. Older records and
exhausted/uncertain cases require operator reconciliation; no automatic blind reset.
Sent means provider acceptance, not confirmed inbox placement or reading.

## Coordinated execution after migration approval

1. Recheck current main/deployment, migration checksum and project
   `mwxvorzrausbnqzjrhqm`. Confirm no object conflicts and capture baseline counts.
2. Apply only the approved migration with 5s lock/30s statement timeouts; no blanket
   db push. Abort uncommitted errors. Verify history once, RLS/ACLs, original account
   and content baselines and empty/no-backfilled outbox. Reconcile repository filename
   if the connected executor records a different version; preserve SQL bytes.
3. Set only Production `BETA_ADMIN_NOTIFICATIONS_ENABLED=true`; existing application
   RESEND_API_KEY is used, never the dedicated authentication SMTP key. Preview has
   no activation flag and remains protected. No other delivery gate is enabled.
4. Release only this tested notification commit via the existing production pipeline.
   Verify READY, production commit/alias, public application availability and private
   admin access. No campaign, applicant approval or participant invitation is sent.
5. Recover any new pending outbox entries from the short migration/deployment window
   through the private controls. No historical records are notified. A real synthetic
   application/email test requires its own explicit approval; automated tests mock
   Resend and use disposable PostgreSQL data.

## Stop and rollback

Disable the production notification activation flag and stop new worker dispatch.
Drain/reconcile in-flight claims; never resend uncertain outcomes. If intake restoration
is necessary, restore the original submit-function SQL (same signature and ACLs) from
the recruitment migration in a bounded transaction. Keep all outbox delivery history.
Do not drop nonempty outbox records, reset accounts or restore vulnerable allergy code.
Queue messages acknowledge while the notification activation flag is off. Restore
application code with a focused forward correction or the immediately previous safe
production commit after owner approval; no unrelated beta rollback.

Local rollback rehearsal restores ordinary intake without deleting applications,
outbox history, user content or existing account entitlements. No shared change or
real notification is authorized merely by this review document.
