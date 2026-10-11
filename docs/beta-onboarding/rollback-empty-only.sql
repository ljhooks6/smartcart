-- Reviewed candidate. Never run automatically or against populated onboarding data.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
lock table public.beta_programs in access exclusive mode;
lock table public.beta_delivery_events in access exclusive mode;
lock table public.beta_engagement_events in access exclusive mode;
lock table public.beta_engagement_daily in access exclusive mode;
lock table public.beta_feedback in access exclusive mode;
lock table public.beta_participations in access exclusive mode;
lock table public.beta_invitation_deliveries in access exclusive mode;
lock table public.beta_invitations in access exclusive mode;
lock table public.beta_operation_rates in access exclusive mode;
do $$ begin if exists(select 1 from public.beta_delivery_events) or exists(select 1 from public.beta_engagement_events) or exists(select 1 from public.beta_engagement_daily) or exists(select 1 from public.beta_feedback) or exists(select 1 from public.beta_participations) or exists(select 1 from public.beta_invitation_deliveries) or exists(select 1 from public.beta_invitations) or exists(select 1 from public.beta_operation_rates) then raise exception 'Rollback refused: onboarding records exist. Disable first and retain data; obtain a reviewed recovery plan.'; end if; end $$;
create or replace function mealcaddie_private.storage_plan(owner_id uuid) returns text
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


drop trigger beta_application_withdrawal on public.beta_applications;
drop function public.beta_onboarding_cleanup();
drop function public.beta_set_onboarding_config(uuid,integer,timestamptz);
drop function public.beta_review_feedback(uuid,uuid,text,text);
drop function public.beta_participant_settings(uuid,boolean,boolean);
drop function public.beta_submit_feedback(uuid,text,text,text,uuid);
drop function public.beta_record_engagement(uuid,text,uuid);
drop function public.beta_effective_plan(uuid);
drop function public.beta_revoke_invitation(uuid,uuid);
drop function public.beta_manage_participation(uuid,uuid,text,text,timestamptz);
drop function public.beta_delivery_event(text,text,text);
drop function public.beta_accept_invitation(uuid,text);
drop function public.beta_finish_delivery(uuid,text,text);
drop function public.beta_claim_delivery(text);
drop function public.beta_issue_invitation(uuid,uuid);
drop function public.beta_onboarding_rate(uuid,text);
drop function public.beta_verified_user(uuid);
drop function mealcaddie_private.beta_application_withdrawal();
drop function mealcaddie_private.beta_feature_plan(uuid);
drop function mealcaddie_private.beta_match_email(text);
drop function mealcaddie_private.beta_verified_email(uuid);
drop table public.beta_delivery_events;
drop table public.beta_engagement_events;
drop table public.beta_engagement_daily;
drop table public.beta_feedback;
drop table public.beta_participations;
drop table public.beta_invitation_deliveries;
drop table public.beta_invitations;
drop table public.beta_operation_rates;
alter table public.beta_programs drop column onboarding_enabled,drop column invitation_delivery_enabled,drop column participation_days,drop column participation_limit_at,drop column wave_size;
-- Keep existing private-schema usage unchanged; all newly exposed helper functions are removed.
commit;
