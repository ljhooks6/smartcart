-- Additive deployment prerequisite. Existing rows and policies remain intact.
alter table public.archived_meals add column if not exists recipe_data jsonb;
alter table public.archived_meals add column if not exists type text;

-- One request and one transaction: failures roll back both week and pantry.
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

