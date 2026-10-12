-- Additive beta recruitment only. No account, entitlement, subscription or Auth changes.
begin;
create table public.beta_programs (
  slug text primary key check (slug = 'public-beta'),
  free_target integer not null default 30 check (free_target between 0 and 10000),
  plus_target integer not null default 15 check (plus_target between 0 and 10000),
  reserve_target integer not null default 5 check (reserve_target between 0 and 10000),
  recruitment_closed_at timestamptz, beta_ended_at timestamptz
);
insert into public.beta_programs(slug) values ('public-beta');
create table public.beta_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(), revoked_at timestamptz
);
-- Initial administrator is seeded separately, only after verified UUID confirmation.
create table public.beta_applications (
  id uuid primary key default gen_random_uuid(),
  program_slug text not null default 'public-beta' references public.beta_programs(slug),
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  frequency text not null check (frequency in ('daily','several_times_week','weekly','occasionally','getting_started')),
  challenges text not null check (length(challenges) between 10 and 1500),
  interests text[] not null check (cardinality(interests) between 1 and 6 and interests <@ array['meal_planning','recipes','groceries','pantry','mobile','plus_features']::text[]),
  plan_interest text not null check (plan_interest in ('free','plus','either')),
  feedback_willing boolean not null,
  beta_consent_version text not null check (beta_consent_version = '2026-10-10-v1'),
  beta_consent_at timestamptz not null default now(),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  source text not null default 'direct' check (source in ('direct','facebook','instagram','friends','community','other')),
  campaign text not null default '' check (length(campaign) <= 80 and campaign ~ '^[a-zA-Z0-9 _.-]*$'),
  status text not null default 'applied' check (status in ('applied','under_review','approved','waitlisted','invited','activated','declined','withdrawn')),
  cohort text check (cohort in ('free','plus','reserve')),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(program_slug,email),
  check (marketing_consent = (marketing_consent_at is not null)),
  check ((status = 'withdrawn') = (withdrawn_at is not null)),
  check (status not in ('approved','invited','activated') or (cohort is not null and cohort in ('free','plus')))
);
create index beta_applications_directory_idx on public.beta_applications(program_slug,created_at desc,id);
create index beta_applications_cohort_idx on public.beta_applications(program_slug,cohort,status);
create table public.beta_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.beta_applications(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  kind text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);
create index beta_application_events_application_idx on public.beta_application_events(application_id,created_at);
create table public.beta_invitation_drafts (
  application_id uuid primary key references public.beta_applications(id) on delete cascade,
  status text not null default 'draft' check (status = 'draft'),
  template_version text not null default 'beta-v1',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.beta_rate_limits (
  network_key text not null check (network_key ~ '^[a-f0-9]{64}$'),
  period text not null check (period in ('hour','day')),
  window_start timestamptz not null, attempts integer not null check (attempts > 0),
  expires_at timestamptz not null, primary key(network_key,period,window_start)
);
create index beta_rate_limits_expiry_idx on public.beta_rate_limits(expires_at);
create table public.beta_program_events (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
  kind text not null, detail jsonb not null default '{}', created_at timestamptz not null default now()
);

-- All browser roles are denied direct access, including administrators. Admins use
-- verified server endpoints; service_role privileges never enter the browser.
alter table public.beta_programs enable row level security;
alter table public.beta_admins enable row level security;
alter table public.beta_applications enable row level security;
alter table public.beta_application_events enable row level security;
alter table public.beta_invitation_drafts enable row level security;
alter table public.beta_rate_limits enable row level security;
alter table public.beta_program_events enable row level security;
revoke all on public.beta_programs,public.beta_admins,public.beta_applications,public.beta_application_events,public.beta_invitation_drafts,public.beta_rate_limits,public.beta_program_events from public,anon,authenticated;
grant all on public.beta_programs,public.beta_admins,public.beta_applications,public.beta_application_events,public.beta_invitation_drafts,public.beta_rate_limits,public.beta_program_events to service_role;

-- SECURITY INVOKER throughout. Only service_role may execute these functions.
create function public.beta_check_rate(p_key text) returns boolean language plpgsql security invoker set search_path='' as $$
declare hour_attempts integer; day_attempts integer;
begin
  insert into public.beta_rate_limits values (p_key,'hour',date_trunc('hour',now()),1,now()+interval '48 hours')
    on conflict(network_key,period,window_start) do update set attempts=least(public.beta_rate_limits.attempts+1,100000)
    returning attempts into hour_attempts;
  insert into public.beta_rate_limits values (p_key,'day',date_trunc('day',now()),1,now()+interval '48 hours')
    on conflict(network_key,period,window_start) do update set attempts=least(public.beta_rate_limits.attempts+1,100000)
    returning attempts into day_attempts;
  return hour_attempts <= 5 and day_attempts <= 20;
end $$;
create function public.beta_submit_application(p_input jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare new_id uuid;
begin
  -- Locks serialize submission against recruitment closure. No existing record is
  -- updated on a duplicate, including its consent, selection or retention state.
  perform 1 from public.beta_programs where slug='public-beta' and recruitment_closed_at is null and beta_ended_at is null for share;
  if not found then raise exception 'recruitment closed'; end if;
  insert into public.beta_applications(email,frequency,challenges,interests,plan_interest,feedback_willing,beta_consent_version,marketing_consent,marketing_consent_at,source,campaign)
    values(lower(btrim(p_input->>'email')),p_input->>'frequency',p_input->>'challenges',array(select jsonb_array_elements_text(p_input->'interests')),p_input->>'plan_interest',(p_input->>'feedback_willing')::boolean,p_input->>'beta_consent_version',coalesce((p_input->>'marketing_consent')::boolean,false),case when (p_input->>'marketing_consent')::boolean then now() end,p_input->>'source',coalesce(p_input->>'campaign',''))
    on conflict(program_slug,email) do nothing returning id into new_id;
  if new_id is not null then insert into public.beta_application_events(application_id,kind) values(new_id,'applied'); end if;
end $$;
create function public.beta_assert_admin(p_actor uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.beta_admins where user_id=p_actor and revoked_at is null for share;
  if not found then raise exception 'admin required'; end if;
end $$;
create function public.beta_update_application(p_actor uuid,p_id uuid,p_status text,p_cohort text,p_expected timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare old_row public.beta_applications; target integer; occupied integer;
begin
  perform public.beta_assert_admin(p_actor);
  perform 1 from public.beta_programs where slug='public-beta' for update;
  select * into old_row from public.beta_applications where id=p_id for update;
  if not found or old_row.updated_at<>p_expected then raise exception 'stale application'; end if;
  if p_status in ('invited','activated') or old_row.status='withdrawn' or (old_row.status in ('invited','activated') and p_status<>'withdrawn') or
    not (p_status=old_row.status or p_status='withdrawn' or
      (old_row.status='applied' and p_status in ('under_review','waitlisted','declined')) or
      (old_row.status='under_review' and p_status in ('approved','waitlisted','declined')) or
      (old_row.status='approved' and p_status in ('under_review','waitlisted','declined')) or
      (old_row.status='waitlisted' and p_status in ('under_review','approved','declined')) or
      (old_row.status='declined' and p_status='under_review')) then raise exception 'transition unavailable'; end if;
  if p_cohort is not null and p_status not in ('declined','withdrawn') then
    select case p_cohort when 'free' then free_target when 'plus' then plus_target when 'reserve' then reserve_target end into target from public.beta_programs where slug='public-beta';
    select count(*) into occupied from public.beta_applications where program_slug='public-beta' and cohort=p_cohort and status not in ('declined','withdrawn') and id<>p_id;
    if target is null or occupied>=target then raise exception 'cohort capacity'; end if;
  end if;
  update public.beta_applications set status=p_status,cohort=case when p_status in ('declined','withdrawn') then null else p_cohort end,
    withdrawn_at=case when p_status='withdrawn' then now() else null end,
    marketing_consent=case when p_status='withdrawn' then false else marketing_consent end,
    marketing_consent_at=case when p_status='withdrawn' then null else marketing_consent_at end, updated_at=clock_timestamp() where id=p_id;
  delete from public.beta_invitation_drafts where application_id=p_id;
  insert into public.beta_application_events(application_id,actor_id,kind,detail) values(p_id,p_actor,'review_changed',jsonb_build_object('from_status',old_row.status,'to_status',p_status,'from_cohort',old_row.cohort,'to_cohort',case when p_status in ('declined','withdrawn') then null else p_cohort end));
end $$;
create function public.beta_directory_counts(p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  perform public.beta_assert_admin(p_actor);
  select jsonb_build_object(
    'cohorts',coalesce((select jsonb_object_agg(cohort,total) from (select cohort,count(*) total from public.beta_applications where cohort is not null and status not in ('declined','withdrawn') group by cohort) c),'{}'::jsonb),
    'statuses',coalesce((select jsonb_object_agg(status,total) from (select status,count(*) total from public.beta_applications group by status) s),'{}'::jsonb),
    'sources',coalesce((select jsonb_object_agg(source,total) from (select source,count(*) total from public.beta_applications group by source) s),'{}'::jsonb)) into result;
  return result;
end $$;
create function public.beta_update_targets(p_actor uuid,p_free integer,p_plus integer,p_reserve integer) returns void language plpgsql security invoker set search_path='' as $$
declare counts jsonb;
begin
  perform public.beta_assert_admin(p_actor);
  perform 1 from public.beta_programs where slug='public-beta' for update;
  counts:=public.beta_directory_counts(p_actor)->'cohorts';
  if p_free<coalesce((counts->>'free')::integer,0) or p_plus<coalesce((counts->>'plus')::integer,0) or p_reserve<coalesce((counts->>'reserve')::integer,0) then raise exception 'cohort capacity'; end if;
  update public.beta_programs set free_target=p_free,plus_target=p_plus,reserve_target=p_reserve where slug='public-beta';
  insert into public.beta_program_events(actor_id,kind,detail) values(p_actor,'targets_changed',jsonb_build_object('free',p_free,'plus',p_plus,'reserve',p_reserve));
end $$;
create function public.beta_draft_invitation(p_actor uuid,p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
  perform public.beta_assert_admin(p_actor);
  perform 1 from public.beta_applications where id=p_id and status='approved' and cohort in ('free','plus') for update;
  if not found then raise exception 'transition unavailable'; end if;
  insert into public.beta_invitation_drafts(application_id,created_by) values(p_id,p_actor) on conflict(application_id) do update set updated_at=clock_timestamp(),created_by=p_actor;
  insert into public.beta_application_events(application_id,actor_id,kind) values(p_id,p_actor,'invitation_drafted');
end $$;
create function public.beta_revoke_marketing(p_actor uuid,p_id uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
  perform public.beta_assert_admin(p_actor);
  update public.beta_applications set marketing_consent=false,marketing_consent_at=null,updated_at=clock_timestamp() where id=p_id;
  if not found then raise exception 'stale application'; end if;
  insert into public.beta_application_events(application_id,actor_id,kind) values(p_id,p_actor,'marketing_revoked');
end $$;
create function public.beta_close_period(p_actor uuid,p_kind text) returns void language plpgsql security invoker set search_path='' as $$
begin
  perform public.beta_assert_admin(p_actor);
  if p_kind='recruitment' then update public.beta_programs set recruitment_closed_at=coalesce(recruitment_closed_at,now()) where slug='public-beta';
  elsif p_kind='beta' then update public.beta_programs set beta_ended_at=coalesce(beta_ended_at,now()),recruitment_closed_at=coalesce(recruitment_closed_at,now()) where slug='public-beta';
  else raise exception 'transition unavailable'; end if;
  insert into public.beta_program_events(actor_id,kind) values(p_actor,p_kind||'_closed');
end $$;
create function public.beta_cleanup(p_actor uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare removed integer; counters integer;
begin
  -- NULL actor is reserved for the service-role-only scheduled cleanup RPC.
  if p_actor is not null then perform public.beta_assert_admin(p_actor); end if;
  -- The program lock prevents cleanup racing with review/selection.
  perform 1 from public.beta_programs where slug='public-beta' for update;
  -- Eligible at day five so the daily schedule has headroom for the seven-day withdrawal deadline.
  delete from public.beta_applications a using public.beta_programs p where p.slug=a.program_slug and
    ((a.status='withdrawn' and a.withdrawn_at<=now()-interval '5 days') or
      (a.status in ('applied','under_review','waitlisted','declined') and p.recruitment_closed_at<=now()-interval '90 days') or
      (a.status in ('approved','invited','activated') and p.beta_ended_at<=now()-interval '90 days'));
  get diagnostics removed=row_count;
  delete from public.beta_rate_limits where expires_at<=now(); get diagnostics counters=row_count;
  delete from public.beta_program_events where created_at<=now()-interval '180 days';
  insert into public.beta_program_events(actor_id,kind,detail) values(p_actor,'retention_cleanup',jsonb_build_object('applications_deleted',removed,'counters_deleted',counters));
  return jsonb_build_object('applications_deleted',removed,'counters_deleted',counters);
end $$;
revoke all on function public.beta_check_rate(text),public.beta_submit_application(jsonb),public.beta_assert_admin(uuid),public.beta_update_application(uuid,uuid,text,text,timestamptz),public.beta_directory_counts(uuid),public.beta_update_targets(uuid,integer,integer,integer),public.beta_draft_invitation(uuid,uuid),public.beta_revoke_marketing(uuid,uuid),public.beta_close_period(uuid,text),public.beta_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.beta_check_rate(text),public.beta_submit_application(jsonb),public.beta_assert_admin(uuid),public.beta_update_application(uuid,uuid,text,text,timestamptz),public.beta_directory_counts(uuid),public.beta_update_targets(uuid,integer,integer,integer),public.beta_draft_invitation(uuid,uuid),public.beta_revoke_marketing(uuid,uuid),public.beta_close_period(uuid,text),public.beta_cleanup(uuid) to service_role;
commit;
