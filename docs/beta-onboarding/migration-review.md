# Migration review and execution candidate — not approved for shared execution

File: `20261011141927_beta_onboarding.sql`.

SHA-256: `f8f3cea725af922f5b8fe590c664f7b90be844deabeb9573232842830e73bd36`.

Eight new RLS-protected tables; explicit browser-deny policies and no browser table privileges. Service-only RPCs verify administrator/user identity passed by the server. Narrow private security-definer helpers use an empty search path; browser execution is revoked. Existing storage counters and ownership policies stay intact. Only `mealcaddie_private.storage_plan(uuid)` changes to consult current beta grants, preserving verified ownership and trusted maintenance behavior. Profile plans, subscriptions, accounts, saved content and general signup are not migrated.

Program controls default disabled. No administrator, applicant, participation or email is seeded. No auth/Stripe/Resend configuration is changed. The migration is transactional with five-second lock and 30-second statement timeouts. It depends on the already-reviewed Phase 1 schema and storage migration version `20261011062506`.

Before shared execution, obtain separate approval for this exact checksum and target `mwxvorzrausbnqzjrhqm`. Reconfirm migration history and no object conflicts, take account/subscription/vault/pantry/menu fingerprints and counter baselines, inspect active writes/locks and back up definitions/policies. Confirm all app/DB release flags off, sending off and no other migrations bundled. Schedule a quiet maintenance window. Apply only this SQL via the approved migration tool, record its returned version, and reconcile repository bookkeeping without changing SQL. Do not run a blanket migration push.

After execution, compare all baseline fingerprints/counts, verify eight table ACLs/RLS and service-only function ACLs, original vault counters/triggers and disabled program flags. Run safe read-only auth/ownership/security checks. Do not create real grants or issue email as a verification shortcut. Report any anomaly before further live action.

Rollback: first pause any sending/queue consumer and disable entitlement/onboarding gates, and disable program delivery/onboarding in a separately approved transaction. This retains beta records and user content; paid access falls back to the unchanged baseline. Do not automatically roll back a committed migration. Abort an uncommitted timed-out transaction safely. `rollback-empty-only.sql` restores the exact original storage helper and removes only the new schema objects if every new table is empty; locks prevent racing inserts. It deliberately refuses populated data and does not use CASCADE. Populated rollback requires a separately reviewed preservation/recovery plan. Existing application/program audit remains. No database reset or migration replay.

Local rehearsal passed in PostgreSQL with unchanged protected-table fingerprints, and regression tests verify empty rollback/reapplication plus refusal on populated participation. Rollback is a review artifact, not a migration and is never automatically executed on the shared project.
