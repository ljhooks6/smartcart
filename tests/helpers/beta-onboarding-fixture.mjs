import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
export const admin='11111111-1111-4111-8111-111111111111';
export const free='22222222-2222-4222-8222-222222222222';
export const plus='33333333-3333-4333-8333-333333333333';
export const paid='44444444-4444-4444-8444-444444444444';
export const stranger='55555555-5555-4555-8555-555555555555';
export async function fixture() {
 const db=new PGlite();
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,confirmed_at timestamptz,is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table smartcart_profiles(id uuid primary key,email text,plan text,beta_status text);
 grant select,insert,update on smartcart_profiles to service_role;
 create table smartcart_subscriptions(id integer primary key,status text);insert into smartcart_subscriptions values(1,'active');
 create table archived_meals(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),name text);
 create table pantry_inventory(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),ingredient_name text,is_owned boolean);
 alter table archived_meals enable row level security;alter table pantry_inventory enable row level security;
 create policy own on archived_meals for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 create policy own on pantry_inventory for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
 grant select,insert,update,delete on archived_meals,pantry_inventory to authenticated;
 `);
 for(const [id,email,plan] of [[admin,'admin@example.invalid','plus'],[free,'free@example.invalid','free'],[plus,'plus@example.invalid','free'],[paid,'paid@example.invalid','plus'],[stranger,'wrong@example.invalid','free']]){
 await db.query('insert into auth.users values($1,$2,now(),now(),false)',[id,email]);await db.query('insert into smartcart_profiles values($1,$2,$3,null)',[id,email,plan]);}
 for(const file of ['20261011003203_beta_recruitment.sql','20261011003522_beta_browser_deny_policies.sql','20261011062506_secure_pantry_vault_limits.sql','20261011153040_beta_onboarding.sql','20261013193916_finalize_product_tiers.sql']) await db.exec(readFileSync('supabase/migrations/'+file,'utf8'));
 await db.query('insert into beta_admins(user_id) values($1)',[admin]);
 await db.exec("update beta_programs set onboarding_enabled=true,invitation_delivery_enabled=true,participation_limit_at=now()+interval '60 days'");
 return db;
}
export async function root(db){await db.exec('reset role');}
export async function server(db){await db.exec('reset role;set role service_role');}
export async function browser(db,id){await root(db);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
export async function approved(db,user,cohort='free') {
 await server(db);
 const email=({[free]:'free',[plus]:'plus',[paid]:'paid',[stranger]:'wrong'})[user]+'@example.invalid';
 await db.query('select beta_submit_application($1)',[JSON.stringify({email,frequency:'weekly',challenges:'Disposable test planning challenge',interests:['recipes'],plan_interest:'either',feedback_willing:true,beta_consent_version:'2026-10-10-v1',marketing_consent:false,source:'direct'})]);
 let row=(await db.query('select *,updated_at::text expected from beta_applications where email=$1',[email])).rows[0];
 for(const status of ['under_review','approved']) {await db.query('select beta_update_application($1,$2,$3,$4,$5)',[admin,row.id,status,cohort,row.expected]);row=(await db.query('select *,updated_at::text expected from beta_applications where id=$1',[row.id])).rows[0];}
 return row;
}
export async function issued(db,user,cohort='free') {
 const a=await approved(db,user,cohort);const hash=createHash('sha256').update(randomUUID()).digest('hex');
 const id=(await db.query('select beta_issue_invitation($1,$2) id',[admin,a.id])).rows[0].id;
 await root(db);await db.exec("update beta_invitation_deliveries set attempted_at=now()-interval '6 seconds' where attempted_at is not null");await server(db);
 const claim=(await db.query('select beta_claim_delivery($1) result',[hash])).rows[0].result;
 if(claim?.id!==id)throw Error('fixture claim mismatch');
 await db.query('select beta_finish_delivery($1,$2,$3)',[id,'accepted',randomUUID()]);return {id,hash,a};
}
export async function activated(db,user,cohort='free') {const invitation=await issued(db,user,cohort);await db.query('select beta_accept_invitation($1,$2)',[user,invitation.hash]);return (await db.query('select * from beta_participations where user_id=$1',[user])).rows[0];}
