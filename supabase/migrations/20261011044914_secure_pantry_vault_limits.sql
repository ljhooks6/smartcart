-- Reviewed, additive enforcement. Does not modify plans, subscriptions or existing content.
begin;
lock table public.archived_meals in share row exclusive mode;
create schema if not exists mealcaddie_private;
revoke all on schema mealcaddie_private from public, anon, authenticated;
create table mealcaddie_private.vault_counts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  saved_count bigint not null check (saved_count >= 0)
);
alter table mealcaddie_private.vault_counts enable row level security;
revoke all on mealcaddie_private.vault_counts from public, anon, authenticated, service_role;
insert into mealcaddie_private.vault_counts(user_id,saved_count)
  select user_id,count(*) from public.archived_meals group by user_id;

-- This internal lookup needs access to Auth and the protected profile; it is not an RPC.
-- Lock the current profile so a concurrent downgrade cannot race an authorized write.
create function mealcaddie_private.storage_plan(owner_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare current_plan text;
begin
  if current_setting('role',true) in ('service_role','postgres','none') then return 'plus'; end if;
  if auth.uid() is null or auth.uid() is distinct from owner_id or not exists (
    select 1 from auth.users where id=owner_id and confirmed_at is not null and not coalesce(is_anonymous,false)
  ) then raise exception using errcode='42501',message='Verified account required for saved content.'; end if;
  select plan into current_plan from public.smartcart_profiles where id=owner_id for share;
  return case when current_plan='plus' then 'plus' else 'free' end;
end;
$$;
revoke all on function mealcaddie_private.storage_plan(uuid) from public,anon,authenticated,service_role;

create function mealcaddie_private.guard_storage_write() returns trigger
language plpgsql security definer set search_path = '' as $$
declare current_plan text;
begin
  if tg_op='UPDATE' and new.user_id is distinct from old.user_id then
    raise exception using errcode='42501',message='Saved content ownership cannot be changed.';
  end if;
  current_plan := mealcaddie_private.storage_plan(new.user_id);
  if tg_table_name='pantry_inventory' and current_plan <> 'plus' then
    raise exception using errcode='42501',message='Pantry memory requires Plus.';
  end if;
  return new;
end;
$$;
revoke all on function mealcaddie_private.guard_storage_write() from public,anon,authenticated,service_role;

-- An atomic counter write avoids count/select races under concurrent REST or RPC writes.
-- AFTER INSERT counts only actual inserts (including upserts), and a rejected cap rolls back
-- the row and counter together. Existing over-cap accounts retain all their saved recipes.
create function mealcaddie_private.track_vault_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare total bigint; current_plan text;
begin
  if tg_op='DELETE' then
    update mealcaddie_private.vault_counts set saved_count=saved_count-1 where user_id=old.user_id;
    return old;
  end if;
  current_plan := mealcaddie_private.storage_plan(new.user_id);
  insert into mealcaddie_private.vault_counts(user_id,saved_count) values(new.user_id,1)
    on conflict(user_id) do update set saved_count=mealcaddie_private.vault_counts.saved_count+1
    returning saved_count into total;
  if current_plan <> 'plus' and total > 5 then
    raise exception using errcode='42501',message='Free accounts can save up to five vault recipes.';
  end if;
  return new;
end;
$$;
revoke all on function mealcaddie_private.track_vault_count() from public,anon,authenticated,service_role;
create trigger mealcaddie_pantry_write_guard before insert or update on public.pantry_inventory
  for each row execute function mealcaddie_private.guard_storage_write();
create trigger mealcaddie_vault_write_guard before insert or update on public.archived_meals
  for each row execute function mealcaddie_private.guard_storage_write();
create trigger mealcaddie_vault_count after insert or delete on public.archived_meals
  for each row execute function mealcaddie_private.track_vault_count();
commit;
