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


create or replace function public.beta_accept_invitation(p_user uuid,p_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare address text; i public.beta_invitations; a public.beta_applications; p public.beta_programs; existing public.beta_participations; until_at timestamptz;
begin
 address:=public.beta_verified_user(p_user);
 select * into p from public.beta_programs where slug='public-beta' and onboarding_enabled and beta_ended_at is null for update;
 if not found then raise exception 'onboarding disabled'; end if;
 select * into i from public.beta_invitations where token_hash=p_hash;
 if not found then raise exception 'invalid invitation'; end if;
 select * into a from public.beta_applications where id=i.application_id for update;
 select * into i from public.beta_invitations where id=i.id for update;
 if address<>a.email or (i.bound_user_id is not null and i.bound_user_id<>p_user) then raise exception 'wrong recipient'; end if;
 if i.state='consumed' then
 select * into existing from public.beta_participations where application_id=a.id and user_id=p_user;
 if found then return jsonb_build_object('activated',true,'alreadyAccepted',true); end if;
 end if;
 if i.state<>'issued' or i.expires_at<=clock_timestamp() or a.status<>'invited' or not exists(select 1 from public.beta_invitation_deliveries where invitation_id=i.id and status in ('accepted','delivered')) then raise exception 'invalid or expired invitation'; end if;
 if exists(select 1 from public.beta_participations where user_id=p_user) then raise exception 'account already participating'; end if;
 until_at:=least(clock_timestamp()+make_interval(days=>p.participation_days),coalesce(p.participation_limit_at,'infinity'::timestamptz));
 if until_at<=clock_timestamp() then raise exception 'program expired'; end if;
 -- Shared profile lock serializes activation against existing saved-content guards.
 perform 1 from public.smartcart_profiles where id=p_user for update;
 insert into public.beta_participations(application_id,user_id,cohort,expires_at) values(a.id,p_user,a.cohort,until_at);
 update public.beta_invitations set state='consumed',bound_user_id=p_user,consumed_at=clock_timestamp() where id=i.id;
 update public.beta_applications set status='activated',updated_at=clock_timestamp() where id=a.id;
 insert into public.beta_application_events(application_id,actor_id,kind) values(a.id,p_user,'activated');
 return jsonb_build_object('activated',true,'expiresAt',until_at,'cohort',a.cohort);
end $$;


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
