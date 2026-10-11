// Disposable localhost only. Never accepts a remote URL or production credential.
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHmac,randomBytes,randomUUID,createHash} from 'node:crypto';
import {writeFileSync,readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../local-test-tools/package.json',import.meta.url));
const {Client}=require('pg');
const api='http://127.0.0.1:54321';
const authContainer=JSON.parse(execFileSync('docker',['inspect','supabase_auth_mealcaddie-auth-isolated'],{encoding:'utf8'}))[0];
const dbContainer=JSON.parse(execFileSync('docker',['inspect','supabase_db_mealcaddie-auth-isolated'],{encoding:'utf8'}))[0];
for(const c of [dbContainer,JSON.parse(execFileSync('docker',['inspect','supabase_kong_mealcaddie-auth-isolated'],{encoding:'utf8'}))[0]])for(const ports of Object.values(c.HostConfig.PortBindings ?? {}))for(const binding of ports)assert.equal(binding.HostIp,'127.0.0.1');
const values=Object.fromEntries(authContainer.Config.Env.map(value=>{const i=value.indexOf('=');return[value.slice(0,i),value.slice(i+1)];}));
const dbValues=Object.fromEntries(dbContainer.Config.Env.map(value=>{const i=value.indexOf('=');return[value.slice(0,i),value.slice(i+1)];}));
const jwt=role=>{const h=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');const p=Buffer.from(JSON.stringify({iss:'supabase',role,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400})).toString('base64url');return`${h}.${p}.${createHmac('sha256',values.GOTRUE_JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`;};
const service=jwt('service_role'),anon=jwt('anon');
const config={host:'127.0.0.1',port:54322,user:'postgres',password:dbValues.POSTGRES_PASSWORD,database:'postgres'};
const db=new Client(config);await db.connect();
const results=[];const users={};
const check=async(name,run)=>{await run();results.push({name,passed:true});console.log('PASS '+name);};
const http=async(path,token,body,method=body?'POST':'GET')=>{const response=await fetch(api+path,{method,headers:{apikey:anon,Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=null}return{status:response.status,data};};
const rpc=async(name,body)=>{const r=await http('/rest/v1/rpc/'+name,service,body);assert.equal(r.status<300,true,'local RPC failed: '+name+' '+r.status);return r.data;};
try{
 await db.query("notify pgrst,'reload schema'");
 for(const name of ['admin','free','plus','paid','wrong']){
 const email=`phase3-${name}-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
 const created=await http('/auth/v1/admin/users',service,{email,password,email_confirm:true});assert.equal(created.status<300,true,'local Auth create');
 const login=await http('/auth/v1/token?grant_type=password',anon,{email,password});assert.equal(login.status,200,'local Auth login');
 users[name]={id:created.data.id,email,password,token:login.data.access_token};
 await db.query('insert into smartcart_profiles(id,email,plan) values($1,$2,$3) on conflict(id) do update set plan=excluded.plan',[users[name].id,email,['admin','paid'].includes(name)?'plus':'free']);
 }
 await db.query('insert into beta_admins(user_id) values($1)',[users.admin.id]);
 await db.query("update beta_programs set onboarding_enabled=true,invitation_delivery_enabled=true,participation_limit_at=now()+interval '60 days'");
 async function invite(name,cohort){
 const user=users[name];await rpc('beta_submit_application',{p_input:{email:user.email,frequency:'weekly',challenges:'Disposable local beta test challenge',interests:['recipes'],plan_interest:'either',feedback_willing:true,beta_consent_version:'2026-10-10-v1',marketing_consent:false,source:'direct'}});
 let a=(await db.query('select *,updated_at::text expected from beta_applications where email=$1',[user.email])).rows[0];
 for(const status of ['under_review','approved']){await rpc('beta_update_application',{p_actor:users.admin.id,p_id:a.id,p_status:status,p_cohort:cohort,p_expected:a.expected});a=(await db.query('select *,updated_at::text expected from beta_applications where id=$1',[a.id])).rows[0];}
 const id=await rpc('beta_issue_invitation',{p_actor:users.admin.id,p_application:a.id});
 await db.query("update beta_invitation_deliveries set attempted_at=now()-interval '6 seconds' where attempted_at is not null");
 const token=randomBytes(32).toString('base64url'),hash=createHash('sha256').update(token).digest('hex');
 const claim=await rpc('beta_claim_delivery',{p_hash:hash});assert.equal(claim.id,id);
 // A fake local transport acknowledgement, not a Resend message or real delivery claim.
 await rpc('beta_finish_delivery',{p_id:id,p_status:'accepted',p_provider:'local-fixture-'+id});return{id,token,hash,application:a.id};
 }
 const before=(await db.query('select md5(coalesce(jsonb_agg(s order by id)::text,\'[]\')) hash from smartcart_subscriptions s')).rows[0].hash;
 users.free.invitation=await invite('free','free');users.plus.invitation=await invite('plus','plus');
 await check('wrong verified account cannot redeem',async()=>{const r=await http('/rest/v1/rpc/beta_accept_invitation',service,{p_user:users.wrong.id,p_hash:users.free.invitation.hash});assert.equal(r.status>=400,true);});
 await check('Free activation across 12 independent PostgreSQL connections consumes once',async()=>{
 const clients=Array.from({length:12},()=>new Client(config));await Promise.all(clients.map(c=>c.connect()));
 try{const outcomes=await Promise.all(clients.map(c=>c.query('select beta_accept_invitation($1,$2) r',[users.free.id,users.free.invitation.hash])));assert.equal(outcomes.filter(r=>!r.rows[0].r.alreadyAccepted).length,1);}finally{await Promise.all(clients.map(c=>c.end()));}
 assert.equal(Number((await db.query('select count(*) n from beta_participations where user_id=$1',[users.free.id])).rows[0].n),1);
 });
 await check('Plus activation uses verified local Auth identity and preserves baseline Free',async()=>{await rpc('beta_accept_invitation',{p_user:users.plus.id,p_hash:users.plus.invitation.hash});assert.equal(await rpc('beta_effective_plan',{p_user:users.plus.id}),'plus');assert.equal((await db.query('select plan from smartcart_profiles where id=$1',[users.plus.id])).rows[0].plan,'free');});
 await check('direct REST denies grant minting and other participant feedback access',async()=>{for(const name of ['free','plus']){for(const table of ['beta_participations','beta_invitations','beta_feedback'])assert.equal((await http('/rest/v1/'+table,users[name].token)).status>=400,true);assert.equal((await http('/rest/v1/rpc/beta_effective_plan',users[name].token,{p_user:users.paid.id})).status>=400,true);}});
 await check('Free direct REST concurrent last-slot writes admit only one and preserve ownership',async()=>{
 for(let n=0;n<4;n++)assert.equal((await http('/rest/v1/archived_meals',users.free.token,{user_id:users.free.id,name:'Synthetic Free recipe'})).status,201);
 const attempts=await Promise.all(Array.from({length:12},()=>http('/rest/v1/archived_meals',users.free.token,{user_id:users.free.id,name:'Concurrent synthetic'})));assert.equal(attempts.filter(r=>r.status===201).length,1);
 assert.equal((await http('/rest/v1/archived_meals',users.free.token,{user_id:users.plus.id,name:'Other owner'})).status,403);
 });
 await check('temporary Plus REST saves pantry and more than five vault recipes',async()=>{for(let n=0;n<7;n++)assert.equal((await http('/rest/v1/archived_meals',users.plus.token,{user_id:users.plus.id,name:'Synthetic Plus recipe'})).status,201);assert.equal((await http('/rest/v1/pantry_inventory',users.plus.token,{user_id:users.plus.id,ingredient_name:'Synthetic pantry',is_owned:true})).status,201);});
 await check('feedback works without analytics consent; retries create one feedback record',async()=>{const body={p_user:users.free.id,p_category:'usability',p_feature:'onboarding',p_message:'The local synthetic invitation steps are clear',p_key:randomUUID()};const first=await rpc('beta_submit_feedback',body);assert.equal(await rpc('beta_submit_feedback',body),first);assert.equal(Number((await db.query('select count(*) n from beta_engagement_events')).rows[0].n),0);});
 await check('promotion preserves expiry and bounded extension rejects excess',async()=>{const p=(await db.query('select * from beta_participations where user_id=$1',[users.free.id])).rows[0];await rpc('beta_manage_participation',{p_actor:users.admin.id,p_id:p.id,p_action:'promote',p_reason:'Local test promotion',p_until:null});assert.equal((await db.query('select expires_at from beta_participations where id=$1',[p.id])).rows[0].expires_at.getTime(),p.expires_at.getTime());const bad=await http('/rest/v1/rpc/beta_manage_participation',service,{p_actor:users.admin.id,p_id:p.id,p_action:'extend',p_reason:'Invalid local extension',p_until:new Date(Date.now()+61*86400000).toISOString()});assert.equal(bad.status>=400,true);});
 await check('expiry blocks new Plus storage, keeps saved content and paid access',async()=>{await db.query("update beta_participations set activated_at=now()-interval '31 days',expires_at=now()-interval '1 second' where user_id=$1",[users.plus.id]);assert.equal(await rpc('beta_effective_plan',{p_user:users.plus.id}),'free');assert.equal(await rpc('beta_effective_plan',{p_user:users.paid.id}),'plus');assert.equal((await http('/rest/v1/archived_meals',users.plus.token,{user_id:users.plus.id,name:'After expiry'})).status,403);const retained=await http('/rest/v1/archived_meals?user_id=eq.'+users.plus.id,users.plus.token);assert.equal(retained.data.length,7);});
 await check('subscription fingerprint unchanged',async()=>{assert.equal((await db.query('select md5(coalesce(jsonb_agg(s order by id)::text,\'[]\')) hash from smartcart_subscriptions s')).rows[0].hash,before);});
 // Leave two disposable journeys active for local browser review only.
 await db.query("update beta_participations set activated_at=now(),expires_at=now()+interval '30 days' where user_id=$1",[users.plus.id]);
 await db.query("update beta_participations set cohort='free' where user_id=$1",[users.free.id]);await db.query("update beta_applications set cohort='free' where email=$1",[users.free.email]);
 writeFileSync('.phase3-lab-state.json',JSON.stringify({users,api},null,2));
 writeFileSync('.env.local',`NEXT_PUBLIC_SUPABASE_URL=${api}\nNEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}\nSUPABASE_SERVICE_ROLE_KEY=${service}\nBETA_ONBOARDING_ENABLED=true\nBETA_ENTITLEMENTS_ENABLED=true\nBETA_INVITATION_DELIVERY_APPROVED=false\nBETA_APPLICATIONS_ENABLED=false\n`);
 writeFileSync('.phase3-test-results.json',JSON.stringify({localOnly:true,realEmailsSent:0,migrationSha256:createHash('sha256').update(readFileSync('supabase/migrations/20261011141927_beta_onboarding.sql')).digest('hex'),results},null,2));
 console.log(`Completed ${results.length} local scenarios; credentials remain in ignored local-only files.`);
}finally{await db.end();}
