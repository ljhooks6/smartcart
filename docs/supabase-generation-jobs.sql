begin;
create table if not exists public.smartcart_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null, quota_key text not null,
  user_id uuid references auth.users(id) on delete cascade,
  request_key uuid not null, input_hash text not null,
  input jsonb not null, plan text not null check (plan in ('guest','free','plus')),
  status text not null default 'queued' check (status in ('queued','running','completed','failed')),
  result jsonb, error text, attempts integer not null default 0,
  usage jsonb not null default '[]', lease_until timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_key, request_key)
);
alter table public.smartcart_generation_jobs add column if not exists retry_at timestamptz;
create index if not exists smartcart_generation_owner_created on public.smartcart_generation_jobs(owner_key,created_at desc);
create index if not exists smartcart_generation_quota_created on public.smartcart_generation_jobs(quota_key,created_at desc);
create index if not exists smartcart_generation_status_created on public.smartcart_generation_jobs(status,created_at);
alter table public.smartcart_generation_jobs enable row level security;
revoke all on public.smartcart_generation_jobs from public,anon,authenticated;
grant all on public.smartcart_generation_jobs to service_role;

create or replace function public.smartcart_create_generation_job(
  p_owner text,p_quota text,p_user uuid,p_request uuid,p_hash text,p_input jsonb,p_plan text,p_limit integer,p_seconds integer
) returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.smartcart_generation_jobs; used integer; period_start timestamptz; reset_at timestamptz;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner,730));
  perform pg_advisory_xact_lock(hashtextextended(p_quota,731));
  delete from public.smartcart_generation_jobs where created_at < now()-interval '30 days';
  update public.smartcart_generation_jobs set status='failed',error='Planning was interrupted. Please start a new plan.',updated_at=now()
    where owner_key=p_owner and ((status='running' and lease_until<now()) or (status='queued' and created_at<now()-interval '30 minutes'));
  select * into j from public.smartcart_generation_jobs where owner_key=p_owner and request_key=p_request;
  if found then
    if j.input_hash<>p_hash then return jsonb_build_object('code','conflict'); end if;
    return jsonb_build_object('job',to_jsonb(j),'reused',true);
  end if;
  select * into j from public.smartcart_generation_jobs where owner_key=p_owner and status in ('queued','running') order by created_at desc limit 1;
  if found then return jsonb_build_object('job',to_jsonb(j),'reused',true); end if;
  period_start := case when p_seconds=86400 then date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'
    else date_trunc('week',now() at time zone 'UTC') at time zone 'UTC' end;
  reset_at := period_start+make_interval(secs=>p_seconds);
  select count(*) into used from public.smartcart_generation_jobs where quota_key=p_quota and created_at>=period_start
    and status<>'failed';
  if used>=p_limit then return jsonb_build_object('code','limit','limit',p_limit,'resetAt',reset_at); end if;
  if (select count(*) from public.smartcart_generation_jobs where quota_key=p_quota and created_at>now()-interval '10 minutes')>=3 then
    return jsonb_build_object('code','burst','retryAfter',600); end if;
  -- Serialize new admissions across quota identities so simultaneous requests cannot overfill the queue.
  perform pg_advisory_xact_lock(7319282);
  if (select count(*) from public.smartcart_generation_jobs where status='queued')>=200 then
    return jsonb_build_object('code','busy','retryAfter',60); end if;
  insert into public.smartcart_generation_jobs(owner_key,quota_key,user_id,request_key,input_hash,input,plan)
    values(p_owner,p_quota,p_user,p_request,p_hash,p_input,p_plan) returning * into j;
  return jsonb_build_object('job',to_jsonb(j),'reused',false,'remaining',p_limit-used-1,'resetAt',reset_at);
end $$;

create or replace function public.smartcart_claim_generation_job(p_id uuid)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.smartcart_generation_jobs;
begin
  perform pg_advisory_xact_lock(7319281);
  select * into j from public.smartcart_generation_jobs where id=p_id for update;
  if not found then return jsonb_build_object('code','done'); end if;
  if j.status in ('completed','failed') then return jsonb_build_object('code','done'); end if;
  if j.status='running' then
    if j.lease_until<now() then
      update public.smartcart_generation_jobs set status='failed',error='Planning was interrupted. Please start a new plan.',updated_at=now() where id=p_id;
      return jsonb_build_object('code','done');
    end if;
    return jsonb_build_object('code','busy');
  end if;
  if j.created_at<now()-interval '30 minutes' or j.attempts>=3 then
    update public.smartcart_generation_jobs set status='failed',error='MealCaddie is busy. Please try a new plan later.',updated_at=now() where id=p_id;
    return jsonb_build_object('code','done');
  end if;
  if j.retry_at>now() then return jsonb_build_object('code','busy','retryAfter',ceil(extract(epoch from j.retry_at-now()))); end if;
  if (select count(*) from public.smartcart_generation_jobs where status='running' and lease_until>now())>=3
    or (select count(*) from public.smartcart_generation_jobs where attempts>0 and updated_at>now()-interval '1 minute')>=6 then
    return jsonb_build_object('code','busy'); end if;
  update public.smartcart_generation_jobs set status='running',attempts=attempts+1,lease_until=now()+interval '6 minutes',updated_at=now()
    where id=p_id returning * into j;
  return jsonb_build_object('job',to_jsonb(j));
end $$;

drop function if exists public.smartcart_finish_generation_job(uuid,integer,text,jsonb,text,jsonb);
create or replace function public.smartcart_finish_generation_job(p_id uuid,p_attempt integer,p_status text,p_result jsonb,p_error text,p_usage jsonb,p_retry_seconds integer default 0)
returns void language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if p_status not in ('completed','failed','queued') then raise exception 'Invalid job state'; end if;
  update public.smartcart_generation_jobs set status=p_status,result=p_result,error=p_error,usage=usage||p_usage,
    lease_until=null,retry_at=case when p_status='queued' then now()+make_interval(secs=>greatest(0,p_retry_seconds)) else null end,updated_at=now() where id=p_id and status='running' and attempts=p_attempt;
end $$;

revoke all on function public.smartcart_create_generation_job(text,text,uuid,uuid,text,jsonb,text,integer,integer) from public,anon,authenticated;
revoke all on function public.smartcart_claim_generation_job(uuid) from public,anon,authenticated;
revoke all on function public.smartcart_finish_generation_job(uuid,integer,text,jsonb,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.smartcart_create_generation_job(text,text,uuid,uuid,text,jsonb,text,integer,integer) to service_role;
grant execute on function public.smartcart_claim_generation_job(uuid) to service_role;
grant execute on function public.smartcart_finish_generation_job(uuid,integer,text,jsonb,text,jsonb,integer) to service_role;
commit;
