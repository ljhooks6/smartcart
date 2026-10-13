-- REVIEW REQUIRED: do not apply to the shared project without separate approval.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.beta_application_notifications (
 application_id uuid primary key references public.beta_applications(id) on delete cascade,
 state text not null default 'pending' check(state in ('pending','sending','sent','blocked','retryable','uncertain')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 lease_id uuid, claimed_at timestamptz,
 provider_id text check(provider_id is null or provider_id ~ '^[a-zA-Z0-9_-]{1,100}$'),
 error_code text check(error_code is null or error_code in ('missing_configuration','provider_rejected','provider_rate_limited','delivery_uncertain','attempt_limit')),
 next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(state<>'sent' or provider_id is not null)
);
alter table public.beta_application_notifications enable row level security;
revoke all on public.beta_application_notifications from public,anon,authenticated,service_role;
grant select,insert,update on public.beta_application_notifications to service_role;
create policy beta_notification_browser_deny on public.beta_application_notifications as restrictive for all to anon,authenticated using(false) with check(false);
comment on table public.beta_application_notifications is 'Transactional admin notification outbox. No questionnaire answers, email bodies or credentials. Cascades with the existing applicant retention/withdrawal deletion procedure; no new cleanup schedule.';

-- Preserve existing normalized duplicate, consent, closure and audit behavior.
create or replace function public.beta_submit_application(p_input jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare new_id uuid;
begin
 perform 1 from public.beta_programs where slug='public-beta' and recruitment_closed_at is null and beta_ended_at is null for share;
 if not found then raise exception 'recruitment closed'; end if;
 insert into public.beta_applications(email,frequency,challenges,interests,plan_interest,feedback_willing,beta_consent_version,marketing_consent,marketing_consent_at,source,campaign)
 values(lower(btrim(p_input->>'email')),p_input->>'frequency',p_input->>'challenges',array(select jsonb_array_elements_text(p_input->'interests')),p_input->>'plan_interest',(p_input->>'feedback_willing')::boolean,p_input->>'beta_consent_version',coalesce((p_input->>'marketing_consent')::boolean,false),case when (p_input->>'marketing_consent')::boolean then now() end,p_input->>'source',coalesce(p_input->>'campaign',''))
 on conflict(program_slug,email) do nothing returning id into new_id;
 if new_id is not null then
  insert into public.beta_application_events(application_id,kind) values(new_id,'applied');
  insert into public.beta_application_notifications(application_id) values(new_id);
 end if;
end $$;

create function public.beta_notification_claim(p_application uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.beta_application_notifications; a public.beta_applications; lease uuid;
begin
 select * into n from public.beta_application_notifications where application_id=p_application for update;
 if not found then return null; end if;
 if n.state='sending' and n.claimed_at<clock_timestamp()-interval '3 minutes' then
  update public.beta_application_notifications set state='uncertain',error_code='delivery_uncertain',updated_at=now() where application_id=p_application;
  return null;
 end if;
 if n.state not in ('pending','retryable','blocked') or n.next_attempt_at>clock_timestamp() then return null; end if;
 if n.attempts>=5 then
  update public.beta_application_notifications set state='blocked',error_code='attempt_limit',updated_at=now() where application_id=p_application; return null;
 end if;
 select * into a from public.beta_applications where id=p_application and withdrawn_at is null;
 if not found then return null; end if;
 lease:=gen_random_uuid();
 update public.beta_application_notifications set state='sending',lease_id=lease,claimed_at=clock_timestamp(),attempts=attempts+1,error_code=null,updated_at=now() where application_id=p_application;
 return jsonb_build_object('applicationId',a.id,'leaseId',lease,'email',a.email,'submittedAt',a.created_at,'interest',a.plan_interest);
end $$;
create function public.beta_notification_finish(p_application uuid,p_lease uuid,p_state text,p_provider text,p_error text,p_delay integer default 0) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_state not in ('sent','retryable','blocked','uncertain') or p_delay not between 0 and 3600 then raise exception 'invalid notification outcome'; end if;
 update public.beta_application_notifications set state=p_state,provider_id=p_provider,error_code=p_error,next_attempt_at=clock_timestamp()+make_interval(secs=>p_delay),updated_at=now()
 where application_id=p_application and lease_id=p_lease and state='sending';
 return found;
end $$;
revoke all on function public.beta_notification_claim(uuid),public.beta_notification_finish(uuid,uuid,text,text,text,integer) from public,anon,authenticated;
grant execute on function public.beta_notification_claim(uuid),public.beta_notification_finish(uuid,uuid,text,text,text,integer) to service_role;
commit;
