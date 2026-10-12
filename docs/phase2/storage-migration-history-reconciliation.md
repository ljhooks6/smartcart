# Storage migration history reconciliation

On October 11, 2026, the repository filename was aligned with the existing shared Supabase execution version, 20261011062506. The canonical file is supabase/migrations/20261011062506_secure_pantry_vault_limits.sql.

Its SHA-256 remains 8C5BF422A1949F85BEC06327ECDA895E00B3B45AA9198AA586CD2A8AC5DF5E90. Its SQL is unchanged from the reviewed 20261011044914 source and matches the recorded migration statements. Historical reports retain the original review filename.

The previously applied 20261009223526_atomic_week_save_and_vault_recipe_details.sql was restored from its recorded statements so all five shared versions have local counterparts. This is repository bookkeeping only; no SQL was executed, history repaired, database reset, or migration replayed.

Shared versions: 20261009223526, 20261011003203, 20261011003522, 20261011023528, 20261011062506. There are no additional local migration versions to bundle. Future commands must still inspect pending migrations before execution; do not use an unrestricted database push.

The storage entitlement test now reads the canonical filename. Application regression suite: 131 passed, zero failed. Rollback remains approval-gated and was not executed.
