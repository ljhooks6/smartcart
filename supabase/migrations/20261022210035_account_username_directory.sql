-- Local development/review only. No Auth identities, profiles or grants are changed.
begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
create table public.account_usernames (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check(username ~ '^[a-z][a-z0-9_]{2,29}$' and username not in ('admin','administrator','support','mealcaddie','beta')),
 created_at timestamptz not null default now()
);
alter table public.account_usernames enable row level security;
create policy deny_browser on public.account_usernames as restrictive for all to anon,authenticated using(false) with check(false);
revoke all on public.account_usernames from public,anon,authenticated;
grant select,insert on public.account_usernames to service_role;
-- Immutable first claim. Only a server-verified confirmed identity may claim a name.
create function public.account_claim_username(p_user uuid,p_username text) returns text
language plpgsql security invoker set search_path='' as $$
declare existing text;
begin
 perform public.beta_verified_user(p_user);
 if p_username<>lower(btrim(p_username)) then raise exception 'invalid username'; end if;
 select username into existing from public.account_usernames where user_id=p_user;
 if existing is not null then return existing; end if;
 insert into public.account_usernames(user_id,username) values(p_user,p_username)
 on conflict(user_id) do nothing;
 return (select username from public.account_usernames where user_id=p_user);
end $$;
revoke all on function public.account_claim_username(uuid,text) from public,anon,authenticated;
grant execute on function public.account_claim_username(uuid,text) to service_role;
commit;
