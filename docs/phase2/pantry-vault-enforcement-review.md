# Pantry and vault enforcement audit

This document records the current behavior before any enforcement migration. The owner confirmed the proposed tier rules. The additive enforcement migration has now been implemented and tested in isolation; it has not been applied to shared Supabase.

## Approved preservation of current tiers

| Operation | Free | Plus |
|---|---|---|
| Pantry inputs for this planning session | Allowed | Allowed |
| Persist pantry memory to cloud | Denied | Allowed |
| Pantry local memory between visits | Current UI does not retain it | Current UI retains it |
| Cloud pantry read/export/delete after downgrade | Preserve own existing content; no new writes | Allowed |
| New reusable Recipe Vault save | Maximum five | No tier cap |
| Vault read, cook, restore to week or delete | Preserve all own existing recipes, including over-cap records after downgrade | Allowed |
| Edit an existing vault record | Allowed without consuming another slot | Allowed |
| New save after downgrade with five or more | Denied until below five; do not remove existing recipes | Allowed if current server plan is Plus |
| Week save / archived-week history | Allowed; pantry argument must not create/update remembered inventory | Allowed |

No changes to profile plan structure, Stripe statuses/subscriptions, generation limits or beta entitlements are proposed. Plus must be read from the protected profile row on the server/database, never user metadata or submitted values. Retain legitimate legacy/paying Plus exactly as currently authorized.

## Every affected application operation

- `smart-cart-app.fixed.tsx`: canPersistPantryMemory controls saved form/local memory, recovery drafts, week snapshots, cloud pantry fetch/hydration and all week-save/reset calls. Client checks are guidance only. Stale Plus state after a downgrade must not authorize cloud writes.
- `smart-cart-persistence.ts`: fetchOwnedPantryItems reads own inventory; fetchArchivedMealRows reads the reusable vault; saveWeekToCloud calls save_mealcaddie_week with meals and nullable pantry. These are Supabase Data API operations, so enforcement must be at the database boundary as well as the interface.
- `performArchiveMeal`: direct archived_meals INSERT; currently checks Free five-slot limit only with the browser's loaded vault length and profile. Concurrent tabs, stale state or a forged client bypass it.
- `performPermanentDelete`: own archived_meals DELETE; week DELETE is separate. Privacy/user-content deletion must not be blocked merely by downgrade.
- `performRestoreMeal`: adds an existing favorite to This Week without removing its reusable vault copy. It must not consume another vault slot.
- `save_mealcaddie_week`: updates old weekly_menus to archived status and inserts active rows; it does **not** insert archived_meals. Historical week rows must not count toward the five reusable vault slots. A non-null pantry replaces inventory; it currently has no plan check.
- Direct REST/SQL-equivalent INSERT/UPDATE/UPSERT on pantry_inventory; INSERT/UPDATE/UPSERT/DELETE on archived_meals. Browser callers can currently use all own-row writes via existing RLS. Ownership-change UPDATE and bulk/concurrent saves need explicit tests.
- Local drafts/guest data never authorize a cloud write. Existing owner RLS, plan/beta_status column restrictions and server AI membership continue unchanged.

## Implemented database protection, awaiting isolated-runtime verification and shared application approval

Use narrow private functions/triggers so direct Supabase REST writes cannot bypass limits. Verify auth.uid() and the matching confirmed auth.users identity, load profile.plan from the protected database row, and prevent ownership transfer. Keep reads/deletes separate from premium additions. Do not add a public privileged RPC with a client user ID or plan argument.

Use a private counter for reusable vault rows, backfilled from existing data, with atomic increment/decrement and locked profile reads. An advisory lock plus count alone is insufficient as a general repeatable-read concurrency guarantee. Counter updates serialize competing inserts and fail safely on serialization conflicts. Failed/bulk writes must roll back counters. Preserve over-cap existing users without deleting rows. Pantry insertion/update requires current Plus; week saves with an unauthorized pantry payload must fail atomically or use a separately approved explicit fallback, never silently change persisted data.

The production database is shared with Preview. Prepare/review/test the migration locally first, then obtain approval to apply that specific SQL. Do not silently apply database enforcement under a code-preview approval.

## Required tests before application

Unauthenticated and unconfirmed identities; cross-user writes/reads; spoofed owner/plan/metadata; direct Data API-equivalent table writes; five/sixth vault insert; bulk rollback; concurrent inserts at four/five slots; existing over-cap read/delete/edit; delete frees a slot; Plus larger vault; downgrade blocks further saves/pantry writes; upgrade restores writes; paid profile remains untouched; pantry write through save-week RPC; empty-pantry payload; week-only saves/history; counters unchanged on failed operations; private helper access denied; repeatable-read conflict safety; rollback preserves all content and plan/subscription rows.

Existing live storage data and policies remain unchanged. A pending implementation must not be reported as deployed protection.

## Validation status

Eight embedded PostgreSQL tests pass for direct REST-role table operations, cap/bulk rollback, spoofed claims, missing/unverified/anonymous identity, owner isolation, current Plus, upgrades/downgrades, upserts, week/pantry RPC atomicity and content-preserving rollback. The complete suite passes 131 tests. HTTP PostgREST and independent-connection concurrency tests remain pending an isolated runtime. Client error paths already retain the recipe/draft and show the database denial. Existing pantry UI still follows its current Free/Plus visibility behavior; owner reads/deletes remain permitted by database policy.
