-- Explicit restrictive policies supplement revoked browser grants and default-deny RLS.
-- Service-role-only server access remains unchanged.
begin;
create policy beta_no_browser_access on public.beta_programs as restrictive for all to anon,authenticated using (false) with check (false);
create policy beta_no_browser_access on public.beta_admins as restrictive for all to anon,authenticated using (false) with check (false);
create policy beta_no_browser_access on public.beta_applications as restrictive for all to anon,authenticated using (false) with check (false);
create policy beta_no_browser_access on public.beta_application_events as restrictive for all to anon,authenticated using (false) with check (false);
create policy beta_no_browser_access on public.beta_invitation_drafts as restrictive for all to anon,authenticated using (false) with check (false);
create policy beta_no_browser_access on public.beta_rate_limits as restrictive for all to anon,authenticated using (false) with check (false);
create policy beta_no_browser_access on public.beta_program_events as restrictive for all to anon,authenticated using (false) with check (false);
commit;
