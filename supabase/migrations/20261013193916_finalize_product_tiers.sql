-- Raise only the Free Vault insertion cap; preserve Plus policy, content, permissions and atomic counters.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
lock table public.archived_meals in share row exclusive mode;
create or replace function mealcaddie_private.track_vault_count() returns trigger
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
  if current_plan <> 'plus' and total > 10 then
    raise exception using errcode='42501',message='Free accounts can save up to ten vault recipes.';
  end if;
  return new;
end;
$$;
revoke all on function mealcaddie_private.track_vault_count() from public,anon,authenticated,service_role;

commit;
