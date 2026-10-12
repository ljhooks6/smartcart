-- PREPARED ONLY. Requires separate shared execution approval.
-- Replace the one placeholder privately with the owner-reviewed Supabase UUID.
-- Never publish customer identifiers in Git or execute the unfilled template.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
select set_config('mealcaddie.reviewed_free_user','REPLACE_WITH_REVIEWED_UUID',true);
do $$declare reviewed uuid := current_setting('mealcaddie.reviewed_free_user')::uuid; existing_reason text;
begin
 if not exists(select 1 from public.beta_access_configuration where singleton and not enabled and not legal_enabled) then
  raise exception 'Preservation requires both database gates disabled';
 end if;
 if not exists(select 1 from auth.users u join public.smartcart_profiles p on p.id=u.id
  where u.id=reviewed and p.plan='free' and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false)) then
  raise exception 'Reviewed verified Free identity no longer matches';
 end if;
 if not exists(select 1 from public.archived_meals where user_id=reviewed) then
  raise exception 'Reviewed saved-content baseline no longer matches';
 end if;
 select reason into existing_reason from public.beta_preserved_accounts where user_id=reviewed;
 if found and existing_reason <> 'existing_free_pending_review' then
  raise exception 'Conflicting preservation decision; review before proceeding';
 end if;
 insert into public.beta_preserved_accounts(user_id,reason) values(reviewed,'existing_free_pending_review') on conflict(user_id) do nothing;
 if not coalesce((public.beta_product_access(reviewed)->>'allowed')::boolean,false) then
  raise exception 'Preservation verification failed';
 end if;
end$$;
commit;
