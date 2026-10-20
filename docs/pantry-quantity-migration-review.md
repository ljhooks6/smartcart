# Pantry migration — read-only release review (2026-10-19)

Reviewed file: `supabase/migrations/20261019045435_pantry_quantity_accounting.sql`

SHA-256: `66bbe03436228caf7ba1cc8f0206ef22da852361bdd089874cff986afa8522e2` (unchanged).

This review inspected SQL, repository dependencies, client call sites and existing isolated test coverage. It is not a fresh hosted-database preflight. No shared SQL, migration, account, policy, subscription or configuration was changed.

## Existing-account compatibility

- Adds nullable quantity/unit and `stock_status NOT NULL DEFAULT 'owned'`. Existing names, owners, IDs and ownership flags are not updated by migration SQL. Existing amounts start unknown. The constant default is compatible with current PostgreSQL behavior; constraints still require a table validation/lock window.
- No profile/plan, subscription, invitation, participation, Vault or weekly-menu data backfill. Application arithmetic never interprets the default owned label as an unlimited quantity.
- RPC signature remains `save_mealcaddie_week(jsonb,jsonb DEFAULT NULL) RETURNS void`. `pantry=NULL` continues to preserve inventory and is the Free-client save path. Legacy string arrays remain accepted; a unique exact name match retains quantity/unit/status. Objects accept only name/quantity/unit/status, bounded lengths/range and at most 200 entries.
- Compatibility limits needing preflight: existing inventories over 200 entries or names over 4,000 characters will need explicit handling before those clients save. Duplicate or case/alias-changed legacy names do not qualify for unique exact-match metadata recovery. No live counts for those conditions are asserted here.
- Full pantry save still replaces the owner's snapshot (and recreates pantry row IDs), as the existing RPC did. It does not provide cross-device field-level merge or prevent a stale full snapshot overwriting a newer one. No external consumers/references to pantry row IDs should be assumed absent without the live dependency preflight.

## Transaction and concurrency safety

- One explicit BEGIN/COMMIT; DDL has 3-second lock timeout and 30-second statement timeout. The latter is per statement, not an overall maintenance deadline. ALTER TABLE requires locking; constraint validation can scan the table. Stop on timeout/error and abort the uncommitted transaction; do not retry blindly.
- Pantry payload validation occurs before weekly-menu changes. The existing per-owner transaction advisory lock serializes calls through this RPC. Week archive/insert plus pantry delete/insert are one transaction; a rejected trigger, bad meal insert or constraint failure rolls back the whole save.
- The migration's SET LOCAL limits apply during migration execution, not automatically to future RPC calls. Direct table writes do not acquire the RPC advisory lock. These are bounded claims, not universal serialization guarantees.

## Ownership and Plus persistence

- SECURITY INVOKER with empty search_path; ownership derives from auth.uid(), not a client user_id. Explicit user filters plus existing RLS remain active. RPC execution stays revoked from PUBLIC/anon and granted to authenticated.
- Existing restrictive beta product policies and explicit beta_product_access_allowed() remain in the function. New accounts do not gain application access by invoking it directly.
- Plus enforcement intentionally remains in the existing INSERT/UPDATE pantry trigger and private verified storage-plan lookup. That lookup preserves stored Plus and checks temporary grant/program expiration using server time. A Free attempt to insert pantry data rejects and rolls back the week save. Owner-only read/delete of existing pantry after downgrade remains the established preservation policy; a permitted empty-array delete is not a new persistent pantry grant.
- Critical dependency: this migration does not recreate RLS policies, entitlement helpers or pantry guards. Their exact live definitions/enabled status and grants must match reviewed prerequisites before approval. Service-role/owner privileges remain privileged; no client key is promoted to them.

## Rollback and coordinated release

1. Before any shared action, confirm project/history/checksum and no conflicting columns/constraints/function overloads; capture counts/fingerprints for profiles, subscriptions, Vault, pantry and weekly menus. Back up the current function definition/permissions and inspect row-ID dependencies, policies and triggers.
2. Obtain separate authorization for this exact migration. Execute only it in a quiet window with stop-on-error transaction handling; no broad migration push or bundled pending files.
3. Verify exact-once history, columns/defaults/constraints, invoker/search_path/grants, intact guards/RLS, unchanged account/content baselines and old/new client compatibility before a separately approved app release.
4. Preferred rollback is application-only while retaining additive columns and backward-compatible RPC. Keep measured metadata. Dropping columns or restoring the older name-only function can destroy quantities on a later save and is not an approved rollback. Any database corrective migration needs independent review/approval.

## Review conclusion

No new permission bypass or unavoidable existing-account data rewrite was found in the reviewed SQL. Shared execution remains blocked pending fresh live prerequisite/content/dependency preflight and explicit migration approval. The candidate cannot be released with Plus quantity cloud sync until the approved database prerequisite exists; the client retains drafts and blocks that sync when columns are absent.

Existing isolated tests cover legacy data preservation, measured and legacy-string roundtrip, Free/anonymous/foreign access denial, atomic failure, invalid fields/ranges, temporary grant expiration, ten-slot Free Vault enforcement and product gating. These tests do not certify current hosted schema state or concurrent network clients.

Primary references: PostgreSQL [ALTER TABLE behavior](https://www.postgresql.org/docs/current/ddl-alter.html) and [CREATE OR REPLACE FUNCTION / invoker semantics](https://www.postgresql.org/docs/current/sql-createfunction.html). The Supabase changelog markdown endpoint could not be fetched by the documentation tool (unsupported content type); no new Supabase API feature or version change is used by this SQL review.
