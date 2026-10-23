-- Preparation only. Does not attach an Auth hook or enable hosted registration.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create schema mealcaddie_auth;
revoke all on schema mealcaddie_auth from public,anon,authenticated,service_role;
grant usage on schema mealcaddie_auth to supabase_auth_admin,service_role;
grant usage on schema public to supabase_auth_admin;

-- Only the provider's trusted internal role gains these read-only columns.
grant select(slug,onboarding_enabled,beta_ended_at,participation_limit_at) on public.beta_programs to supabase_auth_admin;
grant select(id,program_slug,email,status,cohort,beta_consent_version,beta_consent_at,withdrawn_at) on public.beta_applications to supabase_auth_admin;
grant select(id,application_id,bound_user_id,token_hash,state,issued_at,expires_at,revoked_at,consumed_at) on public.beta_invitations to supabase_auth_admin;
create policy auth_signup_program_read on public.beta_programs for select to supabase_auth_admin using(true);
create policy auth_signup_application_read on public.beta_applications for select to supabase_auth_admin using(true);
create policy auth_signup_invitation_read on public.beta_invitations for select to supabase_auth_admin using(true);

create table mealcaddie_auth.signup_permits (
 permit_hash text primary key check(permit_hash ~ '^[a-f0-9]{64}$'),
 invitation_id uuid not null references public.beta_invitations(id) on delete cascade,
 email text not null check(email=lower(btrim(email))),
 created_at timestamptz not null default statement_timestamp(),
 expires_at timestamptz not null default statement_timestamp()+interval '2 minutes',
 check(expires_at>created_at and expires_at<=created_at+interval '2 minutes')
);
alter table mealcaddie_auth.signup_permits enable row level security;
revoke all on mealcaddie_auth.signup_permits from public,anon,authenticated,service_role,supabase_auth_admin;
grant select,insert,delete on mealcaddie_auth.signup_permits to service_role;
grant select,delete on mealcaddie_auth.signup_permits to supabase_auth_admin;
create policy signup_permit_service on mealcaddie_auth.signup_permits for all to service_role using(true) with check(true);
create policy signup_permit_auth_read on mealcaddie_auth.signup_permits for select to supabase_auth_admin using(true);
create policy signup_permit_auth_consume on mealcaddie_auth.signup_permits for delete to supabase_auth_admin using(true);

create function mealcaddie_auth.eligible_signup_invitation(p_email text,p_invitation uuid default null,p_hash text default null)
returns uuid language sql security invoker set search_path='' as $$
 select i.id from public.beta_invitations i
 join public.beta_applications a on a.id=i.application_id
 join public.beta_programs p on p.slug=a.program_slug
 where p.slug='public-beta' and p.onboarding_enabled and p.beta_ended_at is null
   and p.participation_limit_at is not null and statement_timestamp()<p.participation_limit_at
   and a.email=p_email and a.status='invited' and a.cohort in ('free','plus')
   and a.withdrawn_at is null and a.beta_consent_version='2026-10-10-v1' and a.beta_consent_at is not null
   and i.state='issued' and i.bound_user_id is null and i.revoked_at is null and i.consumed_at is null
   and i.token_hash ~ '^[a-f0-9]{64}$' and i.issued_at<=statement_timestamp() and i.expires_at is not null
   and statement_timestamp()<least(i.expires_at,i.issued_at+interval '7 days')
   and (p_invitation is null or i.id=p_invitation) and (p_hash is null or i.token_hash=p_hash)
 limit 1
$$;
revoke all on function mealcaddie_auth.eligible_signup_invitation(text,uuid,text) from public,anon,authenticated,service_role,supabase_auth_admin;
grant execute on function mealcaddie_auth.eligible_signup_invitation(text,uuid,text) to service_role,supabase_auth_admin;

create function public.account_prepare_signup(p_email text,p_invitation_hash text,p_permit_hash text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare invitation uuid;
begin
 if p_email is null or p_email<>lower(btrim(p_email)) or p_invitation_hash is null or p_invitation_hash !~ '^[a-f0-9]{64}$'
    or p_permit_hash is null or p_permit_hash !~ '^[a-f0-9]{64}$' then return false; end if;
 invitation:=mealcaddie_auth.eligible_signup_invitation(p_email,null,p_invitation_hash);
 if invitation is null then return false; end if;
 insert into mealcaddie_auth.signup_permits(permit_hash,invitation_id,email) values(p_permit_hash,invitation,p_email);
 return true;
end $$;
create function public.account_revoke_signup_permit(p_permit_hash text) returns void
language sql security invoker set search_path='' as $$delete from mealcaddie_auth.signup_permits where permit_hash=p_permit_hash$$;
revoke all on function public.account_prepare_signup(text,text,text),public.account_revoke_signup_permit(text) from public,anon,authenticated,supabase_auth_admin;
grant execute on function public.account_prepare_signup(text,text,text),public.account_revoke_signup_permit(text) to service_role;

create function mealcaddie_auth.before_user_created(event jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 address text:=lower(btrim(event #>> '{user,email}'));
 permit text:=event #>> '{user,user_metadata,account_signup_permit}';
 consumed text;
 denied jsonb:='{"error":{"http_code":403,"message":"Account registration requires a current personal MealCaddie invitation."}}'::jsonb;
begin
 -- User metadata is untrusted input: only an unguessable, unused server-backed
 -- capability qualifies. No role, provider, plan or approved=true claim is trusted.
 if jsonb_typeof(event->'user') is distinct from 'object' or address is null or length(address) not between 3 and 254
    or coalesce(event #>> '{user,is_anonymous}','false')<>'false' or permit is null or permit !~ '^[A-Za-z0-9_-]{43}$' then return denied; end if;
 delete from mealcaddie_auth.signup_permits s
 where s.permit_hash=encode(sha256(convert_to(permit,'UTF8')),'hex') and s.email=address and statement_timestamp()<s.expires_at
   and s.invitation_id=mealcaddie_auth.eligible_signup_invitation(address,s.invitation_id,null)
 returning s.permit_hash into consumed;
 if consumed is null then return denied; end if;
 return '{}'::jsonb;
end $$;
revoke all on function mealcaddie_auth.before_user_created(jsonb) from public,anon,authenticated,service_role;
grant execute on function mealcaddie_auth.before_user_created(jsonb) to supabase_auth_admin;
commit;
