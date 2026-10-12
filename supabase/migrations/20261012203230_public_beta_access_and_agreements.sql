-- REVIEW ONLY. No shared execution authorized. Defaults preserve current operation.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.beta_access_configuration (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 legal_enabled boolean not null default false,
 legal_version text,
 legacy_participation_before timestamptz not null default clock_timestamp()
);
insert into public.beta_access_configuration(singleton) values(true);
create table public.beta_preserved_accounts (
 user_id uuid primary key references auth.users(id),
 reason text not null check(reason in ('existing_plus_pending_review','contractual_preservation')),
 recorded_at timestamptz not null default clock_timestamp()
);
-- Preserve existing verified Plus without pretending it represents payment.
insert into public.beta_preserved_accounts(user_id,reason)
 select p.id,'existing_plus_pending_review' from public.smartcart_profiles p join auth.users u on u.id=p.id
 where p.plan='plus' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false);
create table public.legal_agreements (
 user_id uuid not null references auth.users(id),
 terms_version text not null,
 privacy_version text not null,
 safety_version text not null,
 beta_version text not null,
 terms_accepted boolean not null check(terms_accepted),
 privacy_acknowledged boolean not null check(privacy_acknowledged),
 safety_acknowledged boolean not null check(safety_acknowledged),
 beta_accepted boolean not null check(beta_accepted),
 accepted_at timestamptz not null default clock_timestamp(),
 primary key(user_id,terms_version,privacy_version,safety_version,beta_version),
 check(length(terms_version) between 1 and 100 and length(privacy_version) between 1 and 100 and length(safety_version) between 1 and 100 and length(beta_version) between 1 and 100)
);
create table public.beta_privacy_requests (
 user_id uuid not null references auth.users(id),
 request_key uuid not null,
 kind text not null check(kind in ('access_export','account_deletion')),
 state text not null default 'requested' check(state in ('requested','reviewing','completed','declined')),
 created_at timestamptz not null default clock_timestamp(),
 primary key(user_id,request_key)
);
create index beta_privacy_request_directory on public.beta_privacy_requests(created_at desc,request_key);
do $$declare name text;begin
 foreach name in array array['beta_access_configuration','beta_preserved_accounts','legal_agreements','beta_privacy_requests'] loop
 execute format('alter table public.%I enable row level security',name);
 execute format('revoke all on public.%I from public,anon,authenticated,service_role',name);
 end loop;
end$$;
grant select on public.beta_access_configuration,public.beta_preserved_accounts to service_role;
-- Required only for FOR SHARE locking; this column is constrained to true.
-- No service write permission to enabled/legal_enabled/version/cutoff.
grant update(singleton) on public.beta_access_configuration to service_role;
grant select,insert on public.legal_agreements,public.beta_privacy_requests to service_role;
grant select on public.legal_agreements,public.beta_privacy_requests to authenticated;
create policy legal_agreement_owner_read on public.legal_agreements for select to authenticated using((select auth.uid())=user_id);
create policy privacy_request_owner_read on public.beta_privacy_requests for select to authenticated using((select auth.uid())=user_id);
-- No user-controlled tiers, no backfilled agreements, no automatic deletion.
create function mealcaddie_private.product_access(p_user uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.beta_access_configuration; b public.beta_participations; boundary timestamptz;
begin
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null and not coalesce(is_anonymous,false)) then return jsonb_build_object('allowed',false,'reason','verified_account_required');end if;
 if exists(select 1 from public.beta_admins where user_id=p_user and revoked_at is null) then return jsonb_build_object('allowed',true,'reason','administrator');end if;
 if exists(select 1 from public.beta_preserved_accounts where user_id=p_user) then return jsonb_build_object('allowed',true,'reason','preserved_existing_account');end if;
 -- Defensive preservation for future genuine subscription records, not evidence of current payments.
 if exists(select 1 from public.smartcart_subscriptions where user_id=p_user and provider='stripe' and status in ('active','trialing') and provider_subscription_id is not null and current_period_end>clock_timestamp()) then return jsonb_build_object('allowed',true,'reason','verified_subscription');end if;
 select participation_limit_at into boundary from public.beta_programs where slug='public-beta' and beta_ended_at is null;
 if not found or boundary is null or boundary<=clock_timestamp() then return jsonb_build_object('allowed',false,'reason','program_ended');end if;
 select * into b from public.beta_participations where user_id=p_user and revoked_at is null and withdrawn_at is null and activated_at<=clock_timestamp() and expires_at>clock_timestamp();
 if not found then return jsonb_build_object('allowed',false,'reason','active_participation_required');end if;
 select * into c from public.beta_access_configuration where singleton;
 if not found then return jsonb_build_object('allowed',false,'reason','configuration_unavailable');end if;
 if c.legal_enabled and b.activated_at>=c.legacy_participation_before and not exists(select 1 from public.legal_agreements where user_id=p_user and terms_version=c.legal_version and privacy_version=c.legal_version and safety_version=c.legal_version and beta_version=c.legal_version) then return jsonb_build_object('allowed',false,'reason','agreement_review_required');end if;
 return jsonb_build_object('allowed',true,'reason','active_beta');
end$$;
revoke all on function mealcaddie_private.product_access(uuid) from public,anon,authenticated;
grant execute on function mealcaddie_private.product_access(uuid) to service_role;
create function public.beta_product_access(p_user uuid) returns jsonb language sql security invoker set search_path='' as $$select mealcaddie_private.product_access(p_user)$$;
revoke all on function public.beta_product_access(uuid) from public,anon,authenticated;
grant execute on function public.beta_product_access(uuid) to service_role;
-- Authenticated clients can evaluate only their own access, not enumerate UUIDs.
create function public.beta_product_access_allowed() returns boolean
language plpgsql security definer set search_path='' as $$
declare gate boolean;
begin
 select enabled into gate from public.beta_access_configuration where singleton;
 if not found then return false;end if;
 if not gate then return true;end if;
 return coalesce((mealcaddie_private.product_access(auth.uid())->>'allowed')::boolean,false);
end$$;
revoke all on function public.beta_product_access_allowed() from public,anon;
grant execute on function public.beta_product_access_allowed() to authenticated;
do $$declare name text;begin
 foreach name in array array['archived_meals','pantry_inventory','weekly_menus','custom_groceries','user_sessions','profiles'] loop
 execute format('create policy beta_product_gate on public.%I as restrictive for all to authenticated using(public.beta_product_access_allowed()) with check(public.beta_product_access_allowed())',name);
 end loop;
end$$;
-- RLS covers SECURITY INVOKER save_mealcaddie_week; denied writes must raise,
-- not silently archive zero rows. Triggers also cover direct ownership-changing writes.
create function mealcaddie_private.product_write_gate() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true)='authenticated' and not public.beta_product_access_allowed() then raise exception using errcode='42501',message='Active beta or preserved product access required.';end if;
 if tg_op='DELETE' then return old;end if;return new;
end$$;
revoke all on function mealcaddie_private.product_write_gate() from public,anon,authenticated,service_role;
do $$declare name text;begin
 foreach name in array array['archived_meals','pantry_inventory','weekly_menus','custom_groceries','user_sessions','profiles'] loop
 execute format('create trigger beta_product_write_gate before insert or update or delete on public.%I for each row execute function mealcaddie_private.product_write_gate()',name);
 end loop;
end$$;
create or replace function public.beta_accept_invitation(p_user uuid,p_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare address text; i public.beta_invitations; a public.beta_applications; p public.beta_programs; existing public.beta_participations; until_at timestamptz;
begin
 perform 1 from public.beta_access_configuration where singleton for share;
 if not found then raise exception 'Program access configuration unavailable';end if;
 if exists(select 1 from public.beta_access_configuration where singleton and legal_enabled) and not exists(select 1 from public.beta_participations b join public.beta_access_configuration c on c.singleton where b.user_id=p_user and b.activated_at<c.legacy_participation_before) and not exists(select 1 from public.legal_agreements agreement_record join public.beta_access_configuration version_config on version_config.singleton where agreement_record.user_id=p_user and agreement_record.terms_version=version_config.legal_version and agreement_record.privacy_version=version_config.legal_version and agreement_record.safety_version=version_config.legal_version and agreement_record.beta_version=version_config.legal_version) then raise exception 'Current agreements required before activation';end if;
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


create function public.beta_accept_with_agreements(p_user uuid,p_hash text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare c public.beta_access_configuration;
begin
 select * into c from public.beta_access_configuration where singleton for share;
 if c.legal_enabled and not exists(select 1 from public.legal_agreements where user_id=p_user and terms_version=c.legal_version and privacy_version=c.legal_version and safety_version=c.legal_version and beta_version=c.legal_version) then raise exception 'Current agreements required before activation';end if;
 return public.beta_accept_invitation(p_user,p_hash);
end$$;
revoke all on function public.beta_accept_with_agreements(uuid,text) from public,anon,authenticated;
grant execute on function public.beta_accept_with_agreements(uuid,text) to service_role;

create or replace function public.save_mealcaddie_week(meals jsonb, pantry jsonb default null)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
begin
  if not public.beta_product_access_allowed() then raise exception using errcode='42501',message='Active beta or preserved product access required.';end if;
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


commit;
