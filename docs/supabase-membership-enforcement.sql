-- Keep ownership RLS. Only trusted server/admin billing can change entitlements.
begin;
revoke all on public.smartcart_profiles, public.smartcart_subscriptions from public, anon, authenticated;
-- Revoke any explicit column grants as well as table-wide grants.
revoke insert (id,email,plan,beta_status,created_at,updated_at), update (id,email,plan,beta_status,created_at,updated_at), references (id,email,plan,beta_status,created_at,updated_at) on public.smartcart_profiles from public, anon, authenticated;
grant select on public.smartcart_profiles, public.smartcart_subscriptions to authenticated;
grant insert (id,email,plan), update (email) on public.smartcart_profiles to authenticated;
alter policy "Users can insert their own SmartCart profile" on public.smartcart_profiles with check (auth.uid() = id and plan = 'free' and beta_status is null);
drop policy if exists "Users can insert their own SmartCart subscriptions" on public.smartcart_subscriptions;
drop policy if exists "Users can update their own SmartCart subscriptions" on public.smartcart_subscriptions;
commit;
