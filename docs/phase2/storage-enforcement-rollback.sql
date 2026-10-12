-- REVIEW ONLY. Apply only with separate approval after confirming migration objects.
-- Restores the previous client-only tier enforcement without deleting user content.
begin;
lock table public.archived_meals,public.pantry_inventory in share row exclusive mode;
drop trigger mealcaddie_pantry_write_guard on public.pantry_inventory;
drop trigger mealcaddie_vault_write_guard on public.archived_meals;
drop trigger mealcaddie_vault_count on public.archived_meals;
drop function mealcaddie_private.guard_storage_write();
drop function mealcaddie_private.track_vault_count();
drop function mealcaddie_private.storage_plan(uuid);
drop table mealcaddie_private.vault_counts;
-- Leave the private schema in place; never CASCADE unrelated objects.
commit;
