import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {fixture,root,free} from './helpers/beta-onboarding-fixture.mjs';
const hookFile='supabase/migrations/20261023014114_invitation_only_auth_hook.sql';
const usernameFile='supabase/migrations/20261022210035_account_username_directory.sql';
const address='hosted-candidate@example.invalid';
const event=(email=address,provider='email',extra={})=>({user:{id:randomUUID(),email,is_anonymous:false,app_metadata:{provider},user_metadata:{},...extra}});
async function setup(){
 const db=await fixture();await root(db);
 await db.exec('create role supabase_auth_admin; alter default privileges grant all on tables to service_role,anon,authenticated;');
 await db.exec(readFileSync(usernameFile,'utf8'));await db.exec(readFileSync(hookFile,'utf8'));
 const a=(await db.query(`insert into beta_applications(email,frequency,challenges,interests,plan_interest,feedback_willing,beta_consent_version,status,cohort)
 values($1,'weekly','Disposable hosted-auth eligibility fixture',array['recipes'],'free',true,'2026-10-10-v1','invited','free') returning id`,[address])).rows[0].id;
 const i=(await db.query(`insert into beta_invitations(application_id,token_hash,state,issued_at,expires_at)
 values($1,$2,'issued',now(),now()+interval '7 days') returning id`,[a,'a'.repeat(64)])).rows[0].id;
 return {db,a,i};
}
async function hook(db,payload){await db.exec('reset role;set role supabase_auth_admin');return (await db.query('select mealcaddie_auth.before_user_created($1) result',[JSON.stringify(payload)])).rows[0].result;}
async function permit(db){const raw=randomBytes(32).toString('base64url');await db.exec('reset role;set role service_role');const r=await db.query('select account_prepare_signup($1,$2,$3) ready',[address,'a'.repeat(64),createHash('sha256').update(raw).digest('hex')]);assert.equal(r.rows[0].ready,true);return raw;}

test('provider hook admits only current invited recipients; spoofed Auth payloads cannot authorize signup',async()=>{
 const {db}=await setup();try{
  await root(db);const before=(await db.query('select * from smartcart_profiles order by id')).rows;const users=(await db.query('select count(*) n from auth.users')).rows;
  const proof=await permit(db);const valid=event(address,'email',{user_metadata:{account_signup_permit:proof}});assert.deepEqual(await hook(db,valid),{});assert.equal((await hook(db,valid)).error.http_code,403);
  assert.equal((await hook(db,event())).error.http_code,403);assert.equal((await hook(db,event(address,'google'))).error.http_code,403);
  const mismatched=await permit(db);assert.equal((await hook(db,event('uninvited@example.invalid','email',{user_metadata:{account_signup_permit:mismatched}}))).error.http_code,403);
  for(const payload of [event('uninvited@example.invalid'),event('uninvited@example.invalid','google'),event(null),event(address,'email',{is_anonymous:true}),event('uninvited@example.invalid','email',{role:'service_role',email_confirmed_at:new Date().toISOString(),user_metadata:{invited:true,plan:'plus',approved:true},app_metadata:{provider:'google',role:'admin'}})]){
   const result=await hook(db,payload);assert.equal(result.error.http_code,403);assert.equal(result.error.message,'Account registration requires a current personal MealCaddie invitation.');
  }
  await root(db);assert.deepEqual((await db.query('select * from smartcart_profiles order by id')).rows,before);assert.deepEqual((await db.query('select count(*) n from auth.users')).rows,users);assert.equal((await db.query('select count(*) n from beta_participations')).rows[0].n,0);
 }finally{await db.close();}
});

test('provider hook rejects all ineligible invitation/program states without consuming or binding records',async()=>{
 const {db,a,i}=await setup();try{
  const cases=[
   ["update beta_invitations set state='queued' where id=$1",[i]],
   ["update beta_invitations set state='revoked',revoked_at=now() where id=$1",[i]],
   ["update beta_invitations set state='consumed',consumed_at=now() where id=$1",[i]],
   ["update beta_invitations set state='unknown' where id=$1",[i]],
   ["update beta_invitations set expires_at=now()-interval '1 second' where id=$1",[i]],
   ["update beta_invitations set issued_at=now()-interval '8 days',expires_at=now()+interval '1 day' where id=$1",[i]],
   ["update beta_invitations set issued_at=now()+interval '1 day' where id=$1",[i]],
   ["update beta_invitations set token_hash=null where id=$1",[i]],
   ["update beta_invitations set bound_user_id=$2 where id=$1",[i,free]],
   ["update beta_applications set status='approved' where id=$1",[a]],
   ["update beta_applications set status='withdrawn',withdrawn_at=now() where id=$1",[a]],
   ["update beta_programs set onboarding_enabled=false",[]],
   ["update beta_programs set beta_ended_at=now()",[]],
   ["update beta_programs set participation_limit_at=now()-interval '1 second'",[]],
   ["update beta_programs set participation_limit_at=null",[]],
  ];
  cases.push(["update mealcaddie_auth.signup_permits set created_at=now()-interval '2 minutes',expires_at=now()-interval '1 second'",[]]);
  for(const [sql,args] of cases){await root(db);await db.exec('begin');const proof=await permit(db);await root(db);await db.query(sql,args);assert.equal((await hook(db,event(address,'email',{user_metadata:{account_signup_permit:proof}}))).error.http_code,403,sql);await root(db);await db.exec('rollback');}
  const proof=await permit(db);assert.deepEqual(await hook(db,event(address,'email',{user_metadata:{account_signup_permit:proof}})),{});await root(db);const unchanged=(await db.query('select state,bound_user_id,consumed_at from beta_invitations where id=$1',[i])).rows[0];assert.deepEqual(unchanged,{state:'issued',bound_user_id:null,consumed_at:null});
 }finally{await db.close();}
});

test('least-privilege ACLs survive broad defaults; hook failures deny rather than silently allow',async()=>{
 const {db}=await setup();try{
  await root(db);
  for(const privilege of ['SELECT','INSERT'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',['service_role','public.account_usernames',privilege])).rows[0].allowed,true);
  for(const privilege of ['UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'])assert.equal((await db.query('select has_table_privilege($1,$2,$3) allowed',['service_role','public.account_usernames',privilege])).rows[0].allowed,false,privilege);
  await db.exec('set role service_role');assert.equal((await db.query('select account_claim_username($1,$2) username',[free,'verified_fixture'])).rows[0].username,'verified_fixture');
  for(const role of ['anon','authenticated','service_role']){await root(db);await db.exec('set role '+role);await assert.rejects(db.query('select mealcaddie_auth.before_user_created($1)',[JSON.stringify(event())]),/permission/);}
  for(const role of ['anon','authenticated']){await root(db);await db.exec('set role '+role);await assert.rejects(db.query('select * from account_usernames'),/permission/);await assert.rejects(db.query('select * from beta_applications'),/permission/);await assert.rejects(db.query('select account_prepare_signup($1,$2,$3)',[address,'a'.repeat(64),'b'.repeat(64)]),/permission/);}
  await db.exec('reset role;set role supabase_auth_admin');assert.equal((await db.query('select count(email) n from beta_applications')).rows[0].n,1);await assert.rejects(db.query('select challenges from beta_applications'),/permission/);await assert.rejects(db.query('delete from beta_applications'),/permission/);
  const proof=await permit(db);await root(db);await db.exec('revoke select(email) on beta_applications from supabase_auth_admin');await assert.rejects(hook(db,event(address,'email',{user_metadata:{account_signup_permit:proof}})),/permission/);
 }finally{await db.close();}
});
