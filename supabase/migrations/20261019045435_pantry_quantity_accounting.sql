begin;
set local lock_timeout='3s';
set local statement_timeout='30s';
alter table public.pantry_inventory
 add column quantity numeric,
 add column quantity_unit text,
 add column stock_status text not null default 'owned';
alter table public.pantry_inventory add constraint pantry_quantity_range check(quantity is null or (quantity>=0 and quantity<=1000000)),
 add constraint pantry_quantity_unit_length check(quantity_unit is null or length(quantity_unit)<=30),
 add constraint pantry_stock_status_values check(stock_status in ('owned','stocked','low','restock'));
-- No row backfill, no tier changes, no new grants, and existing RLS/write guards remain.
create or replace function public.save_mealcaddie_week(meals jsonb, pantry jsonb default null)
returns void language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=auth.uid(); item jsonb; ingredient text; old_pantry jsonb; legacy_entry jsonb;
begin
 if not public.beta_product_access_allowed() then raise exception using errcode='42501',message='Active beta or preserved product access required.';end if;
 if owner_id is null then raise exception 'Sign in before saving.';end if;
 if jsonb_typeof(meals) is distinct from 'array' then raise exception 'Invalid meal list.';end if;
 if pantry is not null and jsonb_typeof(pantry) is distinct from 'array' then raise exception 'Invalid pantry list.';end if;
 if pantry is not null and jsonb_array_length(pantry)>200 then raise exception 'Too many pantry entries.';end if;
 -- Validate every pantry object before touching the existing week or inventory.
 if pantry is not null then
  for item in select value from jsonb_array_elements(pantry) loop
   if jsonb_typeof(item)='string' then ingredient:=item#>>'{}';
   elsif jsonb_typeof(item)='object' then
    if exists(select 1 from jsonb_object_keys(item) k where k not in ('name','quantity','unit','status')) then raise exception 'Unknown pantry field.';end if;
    ingredient:=item->>'name';
    if jsonb_typeof(item->'name') is distinct from 'string' then raise exception 'Invalid ingredient name.';end if;
    if item ? 'quantity' and jsonb_typeof(item->'quantity') not in ('number','null') then raise exception 'Invalid pantry quantity.';end if;
    if item ? 'quantity' and item->'quantity'<>'null'::jsonb and ((item->>'quantity')::numeric<0 or (item->>'quantity')::numeric>1000000) then raise exception 'Invalid pantry quantity.';end if;
    if item ? 'unit' and (jsonb_typeof(item->'unit') not in ('string','null') or length(item->>'unit')>30) then raise exception 'Invalid quantity unit.';end if;
    if item ? 'status' and (jsonb_typeof(item->'status') is distinct from 'string' or item->>'status' not in ('owned','stocked','low','restock')) then raise exception 'Invalid stock status.';end if;
   else raise exception 'Invalid pantry entry.';end if;
   if ingredient is null or length(trim(ingredient))=0 or length(ingredient)>4000 then raise exception 'Invalid ingredient name.';end if;
  end loop;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,0));
 update public.weekly_menus set status='archived' where user_id=owner_id and status='active_week';
 insert into public.weekly_menus(user_id,meal_title,type,recipe_data,servings_count,status)
 select owner_id,m.value->>'meal_title',m.value->>'type',m.value->'recipe_data',coalesce((m.value->'recipe_data'->>'servings')::integer,2),'active_week' from jsonb_array_elements(meals) as m(value);
 if pantry is not null then
  select coalesce(jsonb_agg(to_jsonb(p)),'[]'::jsonb) into old_pantry from public.pantry_inventory p where user_id=owner_id;
  delete from public.pantry_inventory where user_id=owner_id;
  for item in select value from jsonb_array_elements(pantry) loop
   legacy_entry:=null;
   if jsonb_typeof(item)='string' then
    -- Older clients submit only names. Preserve measured metadata for a unique exact match.
    select case when count(*)=1 then jsonb_agg(p)->0 else null end into legacy_entry
      from jsonb_array_elements(old_pantry) p where p->>'ingredient_name'=item#>>'{}';
   end if;
   insert into public.pantry_inventory(user_id,ingredient_name,is_owned,quantity,quantity_unit,stock_status)
    values(owner_id,case when jsonb_typeof(item)='string' then item#>>'{}' else item->>'name' end,true,
     case when jsonb_typeof(item)='object' then (item->>'quantity')::numeric else (legacy_entry->>'quantity')::numeric end,
     case when jsonb_typeof(item)='object' then item->>'unit' else legacy_entry->>'quantity_unit' end,
     case when jsonb_typeof(item)='object' then coalesce(item->>'status','owned') else coalesce(legacy_entry->>'stock_status','owned') end);
  end loop;
 end if;
end;$$;
revoke all on function public.save_mealcaddie_week(jsonb,jsonb) from public,anon;
grant execute on function public.save_mealcaddie_week(jsonb,jsonb) to authenticated;
commit;
