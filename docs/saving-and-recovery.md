# Saving and recovery

Signed-in weeks use an account-owned local draft. Unsynced drafts (including an empty week) recover after reload; clean drafts defer to cloud data so another device's saved changes can load. Legacy account-owned lineups migrate on first load. Guest lineups stay in separate legacy browser storage and never load account-owned meals.

Saved remains visible until the saved snapshot changes. Saving captures a snapshot, prevents duplicate requests, and leaves edits made during the request unsynced. Retry reports the failure and keeps the draft. If cloud loading failed, Retry Save reloads cloud data before allowing a replacement save. Browser storage failures return a status rather than crashing the app.

`docs/supabase-save-recovery-setup.sql` is the additive database deployment prerequisite. It adds full recipe data and meal type to Vault records, plus the `save_mealcaddie_week` RPC. The RPC runs as the caller with existing ownership policies, derives the owner from `auth.uid()`, rejects unauthenticated callers, serializes saves for one account, and replaces week/pantry in one transaction. A null pantry preserves pantry rows for Free users. Failure rolls back the entire operation. Existing Vault records remain readable; only new saves carry complete metadata.

Vault saves happen immediately. Add to This Week keeps the reusable Vault favorite and adds a local lineup entry; Save Week syncs that lineup change. Vault loading and retry are separate from week saving.

Recipe details use a native modal dialog with background scroll locking, Escape handling, and focus/scroll restoration. Mobile navigation remembers each stage's scroll position during the visit. Reset clears those positions.

Validation: production build and 25 regression tests pass. The exact deployed SQL was executed in isolated PGlite PostgreSQL 0.5.8 against matching columns and ownership policies: dinner/treat/pantry round-trip, meal and pantry failure rollback, full Vault recipe metadata, null-pantry preservation, account isolation, empty-week save, and anonymous rejection all passed. Production read-only checks confirmed the new columns/function, caller permissions, and unchanged existing record counts. No test records were written to production. Desktop recipe focus/scroll recovery, mobile list position, and local dinner/treat reload were checked in the browser. A physical phone synchronization check remains manual.

The Supabase security advisor flagged existing signup/trigger function grants/search paths and disabled leaked-password protection; the new save function had no advisor finding. Those existing items are outside this release.
