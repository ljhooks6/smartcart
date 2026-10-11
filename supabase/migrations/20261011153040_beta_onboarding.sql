-- Phase 3 review candidate. Apply only to the unlinked local lab until separately approved.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
alter table public.beta_programs add column onboarding_enabled boolean not null default false;
alter table public.beta_programs add column invitation_delivery_enabled boolean not null default false;
alter table public.beta_programs add column participation_days integer not null default 30 check(participation_days between 1 and 90);
alter table public.beta_programs add column participation_limit_at timestamptz;
alter table public.beta_programs add column wave_size integer not null default 15 check(wave_size between 1 and 45);

create table public.beta_invitations (
 id uuid primary key default gen_random_uuid(), application_id uuid not null references public.beta_applications(id) on delete cascade,
 bound_user_id uuid references auth.users(id) on delete cascade, token_hash text unique check(token_hash ~ '^[a-f0-9]{64}$'),
 state text not null default 'queued' check(state in ('queued','issued','consumed','revoked','failed','unknown')),
 created_at timestamptz not null default clock_timestamp(), is_resend boolean not null default false, issued_at timestamptz, expires_at timestamptz,
 consumed_at timestamptz, revoked_at timestamptz, created_by uuid references auth.users(id) on delete set null,
 check((issued_at is null)=(expires_at is null))
);
create unique index beta_one_live_invitation on public.beta_invitations(application_id) where state in ('queued','issued','unknown');
create index beta_invitation_application_time on public.beta_invitations(application_id,created_at desc);
create table public.beta_invitation_deliveries (
 invitation_id uuid primary key references public.beta_invitations(id) on delete cascade,
 status text not null default 'queued' check(status in ('queued','sending','accepted','delivered','bounced','complained','failed','unknown','cancelled')),
 provider_id text unique, attempted_at timestamptz, updated_at timestamptz not null default now(),
 error_code text check(error_code in ('provider_rejected','delivery_uncertain','revoked')), idempotency_key text not null unique
);
create table public.beta_participations (
 id uuid primary key default gen_random_uuid(), application_id uuid not null unique references public.beta_applications(id) on delete cascade,
 user_id uuid not null unique references auth.users(id) on delete cascade, cohort text not null check(cohort in ('free','plus')),
 activated_at timestamptz not null default clock_timestamp(), expires_at timestamptz not null,
 consent_version text not null default '2026-10-11-onboarding-v1' check(consent_version='2026-10-11-onboarding-v1'),
 revoked_at timestamptz, withdrawn_at timestamptz, engagement_consent boolean not null default false,
 check(expires_at>activated_at), check(withdrawn_at is null or revoked_at is not null)
);
-- Participation carries the temporary grant. No profile/Stripe plan mutation.
create index beta_participation_active on public.beta_participations(user_id,expires_at) where revoked_at is null;
create table public.beta_feedback (
 id uuid primary key default gen_random_uuid(), participation_id uuid not null references public.beta_participations(id) on delete cascade,
 category text not null check(category in ('bug','suggestion','usability')), feature text not null check(feature in ('planning','cooking','groceries','pantry','vault','onboarding','other')),
 message text not null check(length(btrim(message)) between 10 and 2000),
 status text not null default 'open' check(status in ('open','triaged','in_progress','resolved','duplicate')),
 admin_note text not null default '' check(length(admin_note)<=1000), request_key uuid not null,
 created_at timestamptz not null default clock_timestamp(), updated_at timestamptz not null default clock_timestamp(),
 unique(participation_id,request_key)
);
create index beta_feedback_directory on public.beta_feedback(status,created_at desc);
create table public.beta_engagement_events (
 participation_id uuid not null references public.beta_participations(id) on delete cascade, request_key uuid not null,
 action text not null check(action in ('feedback_submitted','plan_completed')), created_at timestamptz not null default clock_timestamp(),
 primary key(participation_id,request_key)
);
create table public.beta_engagement_daily (
 participation_id uuid not null references public.beta_participations(id) on delete cascade, day date not null,
 action text not null check(action in ('feedback_submitted','plan_completed')), total integer not null check(total>0),
 primary key(participation_id,day,action)
);
create table public.beta_operation_rates (
 user_id uuid not null references auth.users(id) on delete cascade, kind text not null check(kind in ('accept','feedback','settings','admin')),
 hour timestamptz not null, attempts integer not null, primary key(user_id,kind,hour)
);
create table public.beta_delivery_events (
 event_id text primary key check(length(event_id) between 1 and 200), invitation_id uuid not null references public.beta_invitations(id) on delete cascade,
 status text not null check(status in ('accepted','delivered','bounced','complained','failed')), created_at timestamptz not null default clock_timestamp()
);
do $$ declare t text; begin
 foreach t in array array['beta_invitations','beta_invitation_deliveries','beta_participations','beta_feedback','beta_engagement_events','beta_engagement_daily','beta_operation_rates','beta_delivery_events'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant all on public.%I to service_role',t);
 execute format('create policy beta_browser_deny on public.%I for all to anon,authenticated using(false) with check(false)',t);
 end loop;
end $$;

-- Auth is not granted to service_role directly. Narrow unexposed lookups only.
create function mealcaddie_private.beta_verified_email(p_user uuid) returns text language plpgsql security definer set search_path='' as $$
declare address text;
begin
 select lower(btrim(email)) into address from auth.users where id=p_user and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 if address is null then raise exception 'verified account required'; end if;
 return address;
end $$;
create function mealcaddie_private.beta_match_email(p_email text) returns uuid language plpgsql security definer set search_path='' as $$
declare n integer; result uuid;
begin
 select count(*),(array_agg(id))[1] into n,result from auth.users where lower(btrim(email))=p_email and email_confirmed_at is not null and not coalesce(is_anonymous,false);
 if n>1 then raise exception 'ambiguous identity'; end if;
 return result;
end $$;
grant usage on schema mealcaddie_private to service_role;
revoke all on function mealcaddie_private.beta_verified_email(uuid),mealcaddie_private.beta_match_email(text) from public,anon,authenticated;
grant execute on function mealcaddie_private.beta_verified_email(uuid),mealcaddie_private.beta_match_email(text) to service_role;
create function public.beta_verified_user(p_user uuid) returns text language sql security invoker set search_path='' as $$select mealcaddie_private.beta_verified_email(p_user)$$;
create function public.beta_onboarding_rate(p_user uuid,p_kind text) returns void language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 perform public.beta_verified_user(p_user);
 insert into public.beta_operation_rates values(p_user,p_kind,date_trunc('hour',now()),1)
 on conflict(user_id,kind,hour) do update set attempts=public.beta_operation_rates.attempts+1 returning attempts into n;
 if n>(case p_kind when 'feedback' then 10 when 'accept' then 20 else 30 end) then raise exception 'rate limit'; end if;
end $$;
create function public.beta_issue_invitation(p_actor uuid,p_application uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.beta_applications; new_id uuid; bound uuid; count_users integer;
begin
 perform public.beta_assert_admin(p_actor);
 perform 1 from public.beta_programs where slug='public-beta' and onboarding_enabled and beta_ended_at is null for update;
 if not found then raise exception 'onboarding disabled'; end if;
 select * into a from public.beta_applications where id=p_application for update;
 if not found or a.status not in ('approved','invited') or a.cohort not in ('free','plus') then raise exception 'approved applicant required'; end if;
 if exists(select 1 from public.beta_participations where application_id=a.id) then raise exception 'already activated'; end if;
 if exists(select 1 from public.beta_invitations where application_id=a.id and created_at>clock_timestamp()-interval '24 hours') then raise exception 'resend cooldown'; end if;
 if (select count(*) from public.beta_invitations where application_id=a.id and is_resend and created_at>clock_timestamp()-interval '7 days')>=3 then raise exception 'resend limit'; end if;
 bound:=mealcaddie_private.beta_match_email(a.email);
 update public.beta_invitations set state='revoked',revoked_at=clock_timestamp() where application_id=a.id and state in ('queued','issued','unknown');
 update public.beta_invitation_deliveries d set status='cancelled',error_code='revoked',updated_at=now() from public.beta_invitations i where d.invitation_id=i.id and i.application_id=a.id and i.state='revoked' and d.status in ('queued','sending','unknown');
 insert into public.beta_invitations(application_id,bound_user_id,created_by,is_resend) values(a.id,bound,p_actor,exists(select 1 from public.beta_invitations where application_id=a.id)) returning id into new_id;
 insert into public.beta_invitation_deliveries(invitation_id,idempotency_key) values(new_id,'beta-invitation/'||new_id);
 insert into public.beta_application_events(application_id,actor_id,kind) values(a.id,p_actor,'invitation_queued');
 return new_id;
end $$;

-- Worker claims one message at a time; no token payload is persisted.
create function public.beta_claim_delivery(p_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare wave integer; i public.beta_invitations; address text;
begin
 select wave_size into wave from public.beta_programs where slug='public-beta' and onboarding_enabled and invitation_delivery_enabled and beta_ended_at is null for update;
 if not found then raise exception 'delivery disabled'; end if;
 if exists(select 1 from public.beta_invitation_deliveries where attempted_at>now()-interval '5 seconds') then return null; end if;
 if (select count(*) from public.beta_invitation_deliveries where attempted_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC')>=wave then return null; end if;
 -- Stale sends become uncertain, never automatically retried.
 update public.beta_invitation_deliveries set status='unknown',error_code='delivery_uncertain' where status='sending' and attempted_at<now()-interval '2 minutes';
 select v.* into i from public.beta_invitations v join public.beta_invitation_deliveries d on d.invitation_id=v.id join public.beta_applications a on a.id=v.application_id
 where v.state='queued' and d.status='queued' and a.status in ('approved','invited') order by v.created_at limit 1 for update of v;
 if not found then return null; end if;
 select email into address from public.beta_applications where id=i.application_id;
 update public.beta_invitations set state='issued',token_hash=p_hash,issued_at=clock_timestamp(),expires_at=clock_timestamp()+interval '7 days' where id=i.id;
 update public.beta_invitation_deliveries set status='sending',attempted_at=clock_timestamp() where invitation_id=i.id;
 return jsonb_build_object('id',i.id,'email',address,'idempotency_key','beta-invitation/'||i.id);
end $$;
create function public.beta_finish_delivery(p_id uuid,p_status text,p_provider text default null) returns void language plpgsql security invoker set search_path='' as $$
declare a uuid;
begin
 if p_status not in ('accepted','failed','unknown') then raise exception 'invalid delivery state'; end if;
 select application_id into a from public.beta_invitations where id=p_id;
 perform 1 from public.beta_programs where slug='public-beta' for update;
 perform 1 from public.beta_applications where id=a for update;
 update public.beta_invitation_deliveries set status=p_status,provider_id=p_provider,updated_at=clock_timestamp(),error_code=case p_status when 'failed' then 'provider_rejected' when 'unknown' then 'delivery_uncertain' end where invitation_id=p_id and status='sending';
 if not found then raise exception 'stale delivery'; end if;
 update public.beta_invitations set state=case when p_status='accepted' then 'issued' else p_status end where id=p_id and state='issued';
 if p_status='accepted' then update public.beta_applications set status='invited',updated_at=clock_timestamp() where id=a and status='approved'; end if;
 insert into public.beta_application_events(application_id,kind,detail) values(a,'invitation_delivery',jsonb_build_object('status',p_status));
end $$;

create function public.beta_accept_invitation(p_user uuid,p_hash text) returns jsonb language plpgsql security invoker set search_path='' as $$
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

create function public.beta_delivery_event(p_event text,p_provider text,p_status text) returns void language plpgsql security invoker set search_path='' as $$
declare item public.beta_invitation_deliveries; inserted integer;
begin
 if p_status not in ('accepted','delivered','bounced','complained','failed') then raise exception 'invalid delivery event'; end if;
 select * into item from public.beta_invitation_deliveries where provider_id=p_provider for update;
 if not found then return; end if; -- Ignore Auth and unrelated provider messages.
 insert into public.beta_delivery_events(event_id,invitation_id,status) values(p_event,item.invitation_id,p_status) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=0 then return; end if;
 -- A late sent/delivered notification must never erase a failure or complaint.
 if (p_status='accepted' and item.status not in ('sending','unknown','queued')) or
    (p_status='delivered' and item.status in ('bounced','complained','failed','cancelled')) or
    (p_status in ('bounced','failed') and item.status in ('complained','cancelled')) then return; end if;
 update public.beta_invitation_deliveries set status=p_status,updated_at=clock_timestamp() where invitation_id=item.invitation_id;
 -- This event is delivery evidence only. It cannot activate or grant privileges.
end $$;

create function public.beta_manage_participation(p_actor uuid,p_id uuid,p_action text,p_reason text,p_until timestamptz default null) returns void language plpgsql security invoker set search_path='' as $$
declare item public.beta_participations; prog public.beta_programs; occupied integer;
begin
 perform public.beta_assert_admin(p_actor);
 if length(btrim(p_reason)) not between 3 and 500 then raise exception 'reason required'; end if;
 select * into prog from public.beta_programs where slug='public-beta' for update;
 select * into item from public.beta_participations where id=p_id for update;
 if not found then raise exception 'participation not found'; end if;
 if p_action='revoke' then update public.beta_participations set revoked_at=coalesce(revoked_at,clock_timestamp()),engagement_consent=false where id=p_id;
 elsif p_action='promote' then
 if not prog.onboarding_enabled or prog.beta_ended_at is not null or item.revoked_at is not null or item.expires_at<=clock_timestamp() then raise exception 'inactive participation'; end if;
 select count(*) into occupied from public.beta_applications where cohort='plus' and status not in ('withdrawn','declined') and id<>item.application_id;
 if occupied>=prog.plus_target then raise exception 'cohort capacity'; end if;
 update public.beta_participations set cohort='plus' where id=p_id;
 update public.beta_applications set cohort='plus',updated_at=clock_timestamp() where id=item.application_id;
 elsif p_action='extend' then
 if not prog.onboarding_enabled or prog.beta_ended_at is not null or item.revoked_at is not null or prog.participation_limit_at is null or p_until is null or p_until<=greatest(item.expires_at,clock_timestamp()) or p_until>prog.participation_limit_at then raise exception 'extension outside configured boundary'; end if;
 update public.beta_participations set expires_at=p_until where id=p_id;
 else raise exception 'invalid action'; end if;
 insert into public.beta_application_events(application_id,actor_id,kind,detail) values(item.application_id,p_actor,'participation_'||p_action,jsonb_build_object('reason',p_reason,'until',p_until));
end $$;
create function public.beta_revoke_invitation(p_actor uuid,p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
declare a uuid;
begin
 perform public.beta_assert_admin(p_actor);
 perform 1 from public.beta_programs where slug='public-beta' for update;
 select application_id into a from public.beta_invitations where id=p_id;
 perform 1 from public.beta_applications where id=a for update;
 update public.beta_invitations set state='revoked',revoked_at=clock_timestamp() where id=p_id and state not in ('consumed','revoked');
 if not found then raise exception 'invalid invitation'; end if;
 update public.beta_invitation_deliveries set status='cancelled',error_code='revoked' where invitation_id=p_id and status in ('queued','sending','unknown');
 insert into public.beta_application_events(application_id,actor_id,kind) values(a,p_actor,'invitation_revoked');
end $$;

-- Private helper: trusted server caller passes a verified UUID; browser storage requires auth.uid().
create function mealcaddie_private.beta_feature_plan(p_user uuid) returns text language plpgsql security definer set search_path='' as $$
declare base text; participant public.beta_participations; prog public.beta_programs;
begin
 select * into prog from public.beta_programs where slug='public-beta' for share;
 select plan into base from public.smartcart_profiles where id=p_user for share;
 if base='plus' then return 'plus'; end if;
 if not prog.onboarding_enabled or prog.beta_ended_at is not null then return 'free'; end if;
 select * into participant from public.beta_participations where user_id=p_user for share;
 if participant.cohort='plus' and participant.revoked_at is null and participant.expires_at>clock_timestamp() and coalesce(prog.participation_limit_at,'infinity')>clock_timestamp() then return 'plus'; end if;
 return 'free';
end $$;
revoke all on function mealcaddie_private.beta_feature_plan(uuid) from public,anon,authenticated,service_role;
create function public.beta_effective_plan(p_user uuid) returns text language plpgsql security invoker set search_path='' as $$
begin perform public.beta_verified_user(p_user); return mealcaddie_private.beta_feature_plan(p_user); end $$;
-- service_role needs the internal helper only through its unexposed schema.
grant usage on schema mealcaddie_private to service_role;
grant execute on function mealcaddie_private.beta_feature_plan(uuid) to service_role;
create or replace function mealcaddie_private.storage_plan(owner_id uuid) returns text language plpgsql security definer set search_path='' as $$
begin
 if current_setting('role',true) in ('service_role','postgres','none') then return 'plus'; end if;
 if auth.uid() is null or auth.uid() is distinct from owner_id or not exists(select 1 from auth.users where id=owner_id and confirmed_at is not null and not coalesce(is_anonymous,false)) then raise exception using errcode='42501',message='Verified account required for saved content.'; end if;
 return mealcaddie_private.beta_feature_plan(owner_id);
end $$;

create function public.beta_record_engagement(p_user uuid,p_action text,p_key uuid) returns void language plpgsql security invoker set search_path='' as $$
declare p public.beta_participations; inserted integer;
begin
 perform public.beta_verified_user(p_user);
 select * into p from public.beta_participations where user_id=p_user and engagement_consent and revoked_at is null and expires_at>clock_timestamp() for update;
 if not found or not exists(select 1 from public.beta_programs where onboarding_enabled and beta_ended_at is null) then return; end if;
 insert into public.beta_engagement_events values(p.id,p_key,p_action,clock_timestamp()) on conflict do nothing;
 get diagnostics inserted=row_count;
 if inserted=1 then insert into public.beta_engagement_daily values(p.id,(now() at time zone 'UTC')::date,p_action,1) on conflict(participation_id,day,action) do update set total=public.beta_engagement_daily.total+1; end if;
end $$;
create function public.beta_submit_feedback(p_user uuid,p_category text,p_feature text,p_message text,p_key uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare p public.beta_participations; result uuid;
begin
 perform public.beta_verified_user(p_user);
 select * into p from public.beta_participations where user_id=p_user and withdrawn_at is null for share;
 if not found then raise exception 'participation required'; end if;
 -- Feedback remains possible after privilege expiry; optional analytics never gates it.
 insert into public.beta_feedback(participation_id,category,feature,message,request_key) values(p.id,p_category,p_feature,btrim(p_message),p_key)
 on conflict(participation_id,request_key) do update set request_key=excluded.request_key returning id into result;
 perform public.beta_record_engagement(p_user,'feedback_submitted',p_key);
 return result;
end $$;
create function public.beta_participant_settings(p_user uuid,p_consent boolean,p_withdraw boolean) returns void language plpgsql security invoker set search_path='' as $$
declare p public.beta_participations;
begin
 perform public.beta_verified_user(p_user);
 perform 1 from public.beta_programs where slug='public-beta' for update;
 select * into p from public.beta_participations where user_id=p_user for update;
 if not found then raise exception 'participation required'; end if;
 if p_withdraw then
 update public.beta_participations set withdrawn_at=coalesce(withdrawn_at,clock_timestamp()),revoked_at=coalesce(revoked_at,clock_timestamp()),engagement_consent=false where id=p.id;
 update public.beta_applications set status='withdrawn',withdrawn_at=coalesce(withdrawn_at,clock_timestamp()),marketing_consent=false,marketing_consent_at=null,updated_at=clock_timestamp() where id=p.application_id;
 update public.beta_invitations set state='revoked',revoked_at=clock_timestamp() where application_id=p.application_id and state in ('queued','issued','unknown');
 elsif p.withdrawn_at is null and p.revoked_at is null and p.expires_at>clock_timestamp() then update public.beta_participations set engagement_consent=p_consent where id=p.id;
 else raise exception 'inactive participation'; end if;
 if p_withdraw or not p_consent then delete from public.beta_engagement_events where participation_id=p.id; delete from public.beta_engagement_daily where participation_id=p.id; end if;
 insert into public.beta_application_events(application_id,actor_id,kind) values(p.application_id,p_user,case when p_withdraw then 'participant_withdrawn' else 'engagement_consent_changed' end);
end $$;
create function public.beta_review_feedback(p_actor uuid,p_id uuid,p_status text,p_note text) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.beta_assert_admin(p_actor);
 update public.beta_feedback set status=p_status,admin_note=p_note,updated_at=clock_timestamp() where id=p_id;
 if not found then raise exception 'feedback not found'; end if;
 insert into public.beta_program_events(actor_id,kind,detail) values(p_actor,'feedback_reviewed',jsonb_build_object('feedback_id',p_id,'status',p_status));
end $$;
create function public.beta_set_onboarding_config(p_actor uuid,p_wave integer,p_boundary timestamptz) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform public.beta_assert_admin(p_actor);
 perform 1 from public.beta_programs where slug='public-beta' for update;
 if p_boundary is not null and (p_boundary<=clock_timestamp() or exists(select 1 from public.beta_participations where revoked_at is null and expires_at>p_boundary)) then raise exception 'invalid program boundary'; end if;
 update public.beta_programs set wave_size=p_wave,participation_limit_at=p_boundary where slug='public-beta';
 insert into public.beta_program_events(actor_id,kind,detail) values(p_actor,'onboarding_configured',jsonb_build_object('wave_size',p_wave,'boundary',p_boundary));
end $$;

-- Existing administrator withdrawal must also revoke temporary grants immediately.
create function mealcaddie_private.beta_application_withdrawal() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='withdrawn' then
 update public.beta_participations set revoked_at=coalesce(revoked_at,clock_timestamp()),withdrawn_at=coalesce(withdrawn_at,clock_timestamp()),engagement_consent=false where application_id=new.id;
 update public.beta_invitations set state='revoked',revoked_at=clock_timestamp() where application_id=new.id and state in ('queued','issued','unknown');
 delete from public.beta_engagement_events where participation_id in(select id from public.beta_participations where application_id=new.id);
 delete from public.beta_engagement_daily where participation_id in(select id from public.beta_participations where application_id=new.id);
 end if;
 return new;
end $$;
revoke all on function mealcaddie_private.beta_application_withdrawal() from public,anon,authenticated,service_role;
create trigger beta_application_withdrawal after update of status on public.beta_applications for each row execute function mealcaddie_private.beta_application_withdrawal();
create function public.beta_onboarding_cleanup() returns jsonb language plpgsql security invoker set search_path='' as $$
declare raw_count integer; feedback_count integer;
begin
 perform 1 from public.beta_programs where slug='public-beta' for update;
 delete from public.beta_engagement_events where created_at<=now()-interval '30 days'; get diagnostics raw_count=row_count;
 delete from public.beta_feedback f using public.beta_participations t,public.beta_applications a,public.beta_programs p where f.participation_id=t.id and t.application_id=a.id and a.program_slug=p.slug and p.beta_ended_at<=now()-interval '90 days'; get diagnostics feedback_count=row_count;
 delete from public.beta_engagement_daily e using public.beta_participations t,public.beta_applications a,public.beta_programs p where e.participation_id=t.id and t.application_id=a.id and a.program_slug=p.slug and p.beta_ended_at<=now()-interval '90 days';
 delete from public.beta_operation_rates where hour<now()-interval '48 hours';
 return jsonb_build_object('raw_events_deleted',raw_count,'feedback_deleted',feedback_count);
end $$;
-- Explicit function ACLs: no browser RPC can mint a grant or impersonate a UUID.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('beta_verified_user','beta_onboarding_rate','beta_issue_invitation','beta_claim_delivery','beta_finish_delivery','beta_accept_invitation','beta_delivery_event','beta_manage_participation','beta_revoke_invitation','beta_effective_plan','beta_record_engagement','beta_submit_feedback','beta_participant_settings','beta_review_feedback','beta_set_onboarding_config','beta_onboarding_cleanup') loop
 execute 'revoke all on function '||f.sig||' from public,anon,authenticated';
 execute 'grant execute on function '||f.sig||' to service_role';
 end loop;
end $$;
commit;
