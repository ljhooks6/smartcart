-- Additive preparation only; no sends, account changes or subscription changes.
create table public.beta_email_deliveries (
  idempotency_key text primary key check (idempotency_key ~ '^beta-test-v1-[a-f0-9]{64}$'),
  kind text not null check (kind in ('application','invitation','welcome','feedback','admin')),
  state text not null check (state in ('claimed','sent','uncertain')),
  provider_id text,
  created_at timestamptz not null default now()
);
alter table public.beta_email_deliveries enable row level security;
revoke all on public.beta_email_deliveries from public, anon, authenticated;
grant all on public.beta_email_deliveries to service_role;
create policy beta_no_browser_access on public.beta_email_deliveries as restrictive for all to anon, authenticated using(false) with check(false);
comment on table public.beta_email_deliveries is 'Private send claims. No email addresses, application answers, provider bodies or secrets. Uncertain claims require human reconciliation; do not blindly delete or retry.';
