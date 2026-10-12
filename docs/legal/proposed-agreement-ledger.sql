-- REVIEW DRAFT ONLY. Not applied to shared Supabase.
-- Formal CLI migration/version to be created after review.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.legal_agreements (
 user_id uuid not null references auth.users(id),
 terms_version text not null check(length(terms_version) between 1 and 100),
 safety_version text not null check(length(safety_version) between 1 and 100),
 accepted_at timestamptz not null default clock_timestamp(),
 primary key(user_id,terms_version,safety_version)
);
alter table public.legal_agreements enable row level security;
revoke all on public.legal_agreements from public,anon,authenticated;
grant select on public.legal_agreements to authenticated;
create policy legal_agreement_owner_read on public.legal_agreements for select to authenticated using((select auth.uid())=user_id);
revoke all on public.legal_agreements from service_role;
grant select,insert on public.legal_agreements to service_role;
-- No browser writes, no backfill, no update permission, timestamp from database.
commit;
-- Rollback: disable all three legal flags first. If empty, drop the ledger in
-- an approved transaction. If nonempty, preserve/export records and obtain
-- an explicit retention/destruction decision; do not automatically drop it.
-- Retention: proposed counsel decision required; no cron deletion is enabled.
