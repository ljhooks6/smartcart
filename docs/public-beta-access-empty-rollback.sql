-- REVIEW ONLY. Disable Preview/application gate flags first. Never restore vulnerable allergy code.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
do $$begin
 if exists(select 1 from public.beta_access_configuration where enabled or legal_enabled) then raise exception 'Rollback refused: disable reviewed gate configuration first';end if;
 if exists(select 1 from public.legal_agreements) or exists(select 1 from public.beta_privacy_requests) or exists(select 1 from public.beta_preserved_accounts where reason <> 'existing_plus_pending_review') then raise exception 'Rollback refused: preserve new evidence and decisions';end if;
end$$;
drop trigger beta_product_write_gate on public.archived_meals;
drop policy beta_product_gate on public.archived_meals;
drop trigger beta_product_write_gate on public.pantry_inventory;
drop policy beta_product_gate on public.pantry_inventory;
drop trigger beta_product_write_gate on public.weekly_menus;
drop policy beta_product_gate on public.weekly_menus;
drop trigger beta_product_write_gate on public.custom_groceries;
drop policy beta_product_gate on public.custom_groceries;
drop trigger beta_product_write_gate on public.user_sessions;
drop policy beta_product_gate on public.user_sessions;
drop trigger beta_product_write_gate on public.profiles;
drop policy beta_product_gate on public.profiles;
create or replace function public.save_mealcaddie_week(meals jsonb, pantry jsonb default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
begin
  if owner_id is null then raise exception 'Sign in before saving.'; end if;
  if jsonb_typeof(meals) is distinct from 'array' then raise exception 'Invalid meal list.'; end if;
  if pantry is not null and jsonb_typeof(pantry) is distinct from 'array' then raise exception 'Invalid pantry list.'; end if;
  -- Serialize concurrent saves for the same account.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  update public.weekly_menus set status = 'archived'
    where user_id = owner_id and status = 'active_week';
  insert into public.weekly_menus(user_id, meal_title, type, recipe_data, servings_count, status)
    select owner_id, item->>'meal_title', item->>'type', item->'recipe_data',
      coalesce((item->'recipe_data'->>'servings')::integer, 2), 'active_week'
    from jsonb_array_elements(meals) item;
  if pantry is not null then
    delete from public.pantry_inventory where user_id = owner_id;
    insert into public.pantry_inventory(user_id, ingredient_name, is_owned)
      select owner_id, item, true from jsonb_array_elements_text(pantry) item;
  end if;
end;
$$;
revoke all on function public.save_mealcaddie_week(jsonb, jsonb) from public, anon;
grant execute on function public.save_mealcaddie_week(jsonb, jsonb) to authenticated;


drop function public.beta_accept_with_agreements(uuid,text);
drop function public.beta_product_access(uuid);
drop function mealcaddie_private.product_write_gate();
drop function public.beta_product_access_allowed();
drop function mealcaddie_private.product_access(uuid);
drop table public.beta_privacy_requests;
drop table public.legal_agreements;
drop table public.beta_preserved_accounts;
drop table public.beta_access_configuration;
commit;
