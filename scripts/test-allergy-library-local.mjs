// Opt-in integration exercise. Reuses ONLY the loopback, unlinked disposable
// Auth lab and a new throwaway PostgreSQL database + cached PostgREST image.
// Never pulls images, reads .env files, reaches shared projects or sends email.
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import http from 'node:http';
import {execFileSync,spawnSync} from 'node:child_process';import {createHmac,randomBytes,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';import {createClient} from '@supabase/supabase-js';import assert from 'node:assert/strict';
import {loader} from '../tests/helpers/load-local-ts.mjs';
if(process.env.RUN_DISPOSABLE_ALLERGY_LAB!=='1')throw Error('Explicit local-lab opt-in required');
const require=createRequire(import.meta.url),pg=require(process.env.MEALCADDIE_LOCAL_PG_MODULE??'pg');
const suffix=randomBytes(4).toString('hex'),database='mealcaddie_allergy_'+suffix,container='mealcaddie-allergy-rest-'+suffix;
if(!/^mealcaddie_allergy_[a-f0-9]{8}$/.test(database)||!/^mealcaddie-allergy-rest-[a-f0-9]{8}$/.test(container))throw Error('Invalid disposable target');
const docker=(args,input)=>{const r=spawnSync('docker',args,{input,encoding:'utf8',windowsHide:true,timeout:60000});if(r.status!==0)throw Error('Local Docker step failed: '+args[0]);return r.stdout;};
const inspect=name=>JSON.parse(docker(['inspect',name]))[0];
const auth=inspect('supabase_auth_mealcaddie-auth-isolated'),rest=inspect('supabase_rest_mealcaddie-auth-isolated'),dbInfo=inspect('supabase_db_mealcaddie-auth-isolated');
if(fs.existsSync(path.resolve('../auth-email-lab/supabase/.temp/project-ref')))throw Error('Auth lab must remain unlinked');
const envMap=c=>Object.fromEntries(c.Config.Env.map(v=>{const i=v.indexOf('=');return [v.slice(0,i),v.slice(i+1)];}));
const authEnv=envMap(auth),restEnv=envMap(rest),dbEnv=envMap(dbInfo);
const jwtSecret=authEnv.GOTRUE_JWT_SECRET;if(!jwtSecret||!restEnv.PGRST_JWT_SECRET)throw Error('Local JWT configuration missing');
const restJwks=restEnv.PGRST_JWT_SECRET.startsWith('{')?JSON.parse(restEnv.PGRST_JWT_SECRET):{keys:[]};
// Current local Auth issues asymmetric user JWTs. Retain those public keys and
// add the existing lab's legacy HMAC verifier ONLY to this disposable REST.
restJwks.keys=restJwks.keys.filter(k=>k.kty!=='oct');
restJwks.keys.push({kty:'oct',k:Buffer.from(jwtSecret).toString('base64url'),alg:'HS256'});
const network=Object.keys(dbInfo.NetworkSettings.Networks).find(n=>Object.hasOwn(rest.NetworkSettings.Networks,n));if(!network)throw Error('Local network missing');
const bindings=inspect('supabase_kong_mealcaddie-auth-isolated').HostConfig.PortBindings;
if(!Object.values(bindings).flat().some(b=>b.HostIp==='127.0.0.1'&&b.HostPort==='54321'))throw Error('Expected loopback Auth gateway missing');
function jwt(role){const b=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const head=b({alg:'HS256',typ:'JWT'}),body=b({iss:'supabase-demo',role,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+7200});return `${head}.${body}.${createHmac('sha256',jwtSecret).update(head+'.'+body).digest('base64url')}`;}
const anon=jwt('anon'),service=jwt('service_role');
const originalAuth=createClient('http://127.0.0.1:54321',service,{auth:{autoRefreshToken:false,persistSession:false}});
const created=[],results=[];let db,proxy,started=false,createdDB=false;
const envFile=path.join(os.tmpdir(),container+'.env');
async function check(name,fn){await fn();results.push({name,passed:true});console.log('PASS '+name);}
try{
 for(const cohort of ['free','plus']){
  const email=`allergy-${suffix}-${cohort}@example.invalid`,password=randomBytes(24).toString('base64url');
  const r=await originalAuth.auth.admin.createUser({email,password,email_confirm:true});if(r.error||!r.data.user)throw Error('Synthetic local account creation failed');
  created.push({id:r.data.user.id,email,password,plan:cohort});
 }
 docker(['exec','-i',dbInfo.Name.slice(1),'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',`create database ${database}`]);createdDB=true;
 db=new pg.Client({host:'127.0.0.1',port:54322,user:'postgres',password:dbEnv.POSTGRES_PASSWORD,database});await db.connect();
 await db.query(`create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,confirmed_at timestamptz,is_anonymous boolean default false);
 create function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'))::uuid$$;
 grant usage on schema auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 create table smartcart_profiles(id uuid primary key,email text,plan text,beta_status text);grant select,insert,update on smartcart_profiles to service_role;
 create table smartcart_subscriptions(id integer primary key,status text,user_id uuid,provider text,provider_subscription_id text,current_period_end timestamptz);insert into smartcart_subscriptions(id,status) values(1,'disabled-fixture');
 create table archived_meals(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),name text,ingredients jsonb,instructions jsonb,recipe_data jsonb);
 create table pantry_inventory(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id),ingredient_name text,is_owned boolean);
 create table weekly_menus(id uuid primary key default gen_random_uuid(),user_id uuid,meal_title text,type text,recipe_data jsonb,servings_count integer,status text);
 create table custom_groceries(id uuid primary key default gen_random_uuid(),user_id uuid,item_name text);
 create table user_sessions(id uuid primary key default gen_random_uuid(),user_id uuid,weeklymenu jsonb);create table profiles(id uuid primary key,dietary_preferences text);
 ${['archived_meals','pantry_inventory','weekly_menus','custom_groceries','user_sessions','profiles'].map(t=>`alter table ${t} enable row level security;create policy own on ${t} for all to authenticated using(auth.uid()=${t==='profiles'?'id':'user_id'}) with check(auth.uid()=${t==='profiles'?'id':'user_id'});grant select,insert,update,delete on ${t} to authenticated;`).join('\n')}
 `);
 for(const u of created){await db.query('insert into auth.users values($1,$2,now(),now(),false)',[u.id,u.email]);await db.query('insert into smartcart_profiles values($1,$2,$3,null)',[u.id,u.email,u.plan]);}
 for(const file of ['20261011003203_beta_recruitment.sql','20261011003522_beta_browser_deny_policies.sql','20261011062506_secure_pantry_vault_limits.sql','20261011153040_beta_onboarding.sql','20261013193916_finalize_product_tiers.sql','20261012222908_public_beta_access_and_agreements.sql'])await db.query(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.query(fs.readFileSync('docs/supabase-generation-jobs.sql','utf8'));
 await db.query("insert into beta_preserved_accounts(user_id,reason) values($1,'existing_free_pending_review')",[created[0].id]);await db.query('update beta_access_configuration set enabled=true');
 const uri=new URL(restEnv.PGRST_DB_URI);uri.pathname='/'+database;
 // Preserve cached local REST configuration except the disposable DB target.
 const restVars={...restEnv,PGRST_DB_URI:uri.toString(),PGRST_DB_SCHEMAS:'public',PGRST_DB_EXTRA_SEARCH_PATH:'public',PGRST_JWT_SECRET:JSON.stringify(restJwks)};
 fs.writeFileSync(envFile,Object.entries(restVars).map(([k,v])=>`${k}=${v}`).join('\n'));
 docker(['run','--detach','--rm','--pull=never','--name',container,'--network',network,'--publish','127.0.0.1:54332:3000','--env-file',envFile,rest.Image]);started=true;
 proxy=http.createServer((request,response)=>{
  const isAuth=request.url.startsWith('/auth/v1/'),port=isAuth?54321:54332;
  const url=isAuth?request.url:request.url.replace(/^\/rest\/v1/,'');
  const upstream=http.request({hostname:'127.0.0.1',port,path:url,method:request.method,headers:{...request.headers,host:'127.0.0.1:'+port}},r=>{response.writeHead(r.statusCode,r.headers);r.pipe(response);});
  upstream.on('error',()=>{response.writeHead(503);response.end();});request.pipe(upstream);
 });await new Promise(resolve=>proxy.listen(54335,'127.0.0.1',resolve));
 let lastStatus=0,lastCode='';
 for(let i=0;i<30;i++){try{const r=await fetch('http://127.0.0.1:54335/rest/v1/',{headers:{apikey:anon,Authorization:'Bearer '+anon}});lastStatus=r.status;if(r.ok)break;const body=await r.json().catch(()=>({}));lastCode=typeof body.code==='string'?body.code:'';}catch{}if(i===29){
   const logs=spawnSync('docker',['logs',container],{encoding:'utf8',windowsHide:true});
   let diagnostic=(logs.stdout+'\n'+logs.stderr).split('\n').filter(s=>/error|fatal|failed/i.test(s)).slice(-4).join('\n');
   for(const secret of [jwtSecret,anon,service,restEnv.PGRST_DB_URI,uri.toString(),dbEnv.POSTGRES_PASSWORD])if(secret)diagnostic=diagnostic.replaceAll(secret,'[local secret withheld]');
   diagnostic=diagnostic.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,'[local JWT withheld]').replace(/postgres(?:ql)?:\/\/[^\s"\\]+/g,'[local DB URL withheld]');
   console.error(diagnostic.slice(0,2000));throw Error(`Disposable REST unavailable (${lastStatus}, ${lastCode})`);
  }await new Promise(r=>setTimeout(r,300));}
 Object.assign(process.env,{NODE_ENV:'development',MEALCADDIE_ALLERGY_LAB:'true',MEALCADDIE_ALLERGY_INTEGRATION:'true',MEALCADDIE_ALLERGY_LOCAL_SUPABASE_URL:'http://127.0.0.1:54335',MEALCADDIE_ALLERGY_LOCAL_ANON_KEY:anon,MEALCADDIE_ALLERGY_LOCAL_SERVICE_KEY:service,MEALCADDIE_ALLERGY_LOCAL_SIGNING_KEY:randomBytes(32).toString('base64url'),MEALCADDIE_ALLERGY_LOCAL_USER_IDS:created.map(u=>u.id).join(',')});delete process.env.VERCEL;delete process.env.VERCEL_ENV;
 const load=loader(),{POST}=load('app/api/labs/allergy-library/route.ts'),{writeDiet}=load('lib/dietary-safety.ts');
 const diet=writeDiet('No preference',{allergies:['Milk','Eggs','Peanuts','Sesame'],preferences:[],customAllergies:'',intolerances:'',medical:''});
 const input={diet,budget:150,householdSize:2,count:7,includeDessert:true,availableEquipment:['Oven','Stovetop'],maxMinutes:60};
 const baseline=(await db.query('select * from smartcart_profiles order by id')).rows;
 for(const u of created){
  const client=createClient('http://127.0.0.1:54335',anon,{auth:{autoRefreshToken:false,persistSession:false}});
  const login=await client.auth.signInWithPassword({email:u.email,password:u.password});assert.equal(login.error,null);const bearer=login.data.session.access_token;
  const call=async body=>{const r=await POST(new Request('http://127.0.0.1:3011/api/labs/allergy-library',{method:'POST',headers:{Origin:'http://127.0.0.1:3011',Authorization:'Bearer '+bearer},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};};
  const command={action:'generate',requestKey:randomUUID(),input,rejected:[]};let generated,saved;
  await check(u.plan+' actual Auth → route → PostgREST → PostgreSQL generation',async()=>{generated=await call(command);assert.equal(generated.status,200,JSON.stringify(generated.data));assert.equal(generated.data.job.status,'completed');});
  await check(u.plan+' retry / reopening consumes one allowance',async()=>{const r=await call(command);assert.equal(r.status,200);assert.equal(r.data.reused,true);assert.equal((await db.query("select count(*)::int n from smartcart_generation_jobs where user_id=$1 and status='completed'",[u.id])).rows[0].n,1);});
  await check(u.plan+' authenticated Vault and week save / reopen',async()=>{const token=generated.data.provenance;saved=await call({action:'save-vault',provenance:token,recipeId:generated.data.plan.recipeIds[0],currentDiet:diet});assert.equal(saved.status,200,JSON.stringify(saved.data));assert.equal((await call({action:'open',table:'vault',id:saved.data.id,currentDiet:diet})).status,200);assert.equal((await call({action:'save-week',provenance:token,currentDiet:diet})).status,200);});
  await check(u.plan+' direct REST ownership and quota bypass denied',async()=>{const wrong=await client.from('archived_meals').insert({user_id:created.find(v=>v.id!==u.id).id,name:'Wrong owner'});assert.ok(wrong.error);const rpc=await client.rpc('smartcart_claim_generation_job',{p_id:generated.data.job.id});assert.ok(rpc.error);});
  await check(u.plan+' forged provenance and changed grocery list rejected',async()=>{assert.equal((await call({action:'save-week',provenance:generated.data.provenance.slice(0,-5)+'xxxxx',currentDiet:diet})).status,422);const proposed=generated.data.plan.groceries.map(l=>({name:l.name,quantity:l.quantity,unit:l.unit}));proposed.push({name:'Tahini',quantity:5,unit:'g'});assert.equal((await call({action:'groceries',provenance:generated.data.provenance,proposed,currentDiet:diet})).status,422);});
 }
 await check('profiles / subscription fixture unchanged',async()=>{assert.deepEqual((await db.query('select * from smartcart_profiles order by id')).rows,baseline);assert.equal((await db.query('select status from smartcart_subscriptions')).rows[0].status,'disabled-fixture');});
 if(process.env.MEALCADDIE_TEST_LIBRARY_BROWSER==='1'){
  // Reset ONLY this disposable fixture's synthetic content for the UI journey.
  await db.query('delete from weekly_menus;delete from archived_meals');
  await check('ordinary six-tab browser journeys on Free and Plus',async()=>{const {exerciseLibraryBrowser}=await import('./test-allergy-library-browser.mjs');assert.equal(await exerciseLibraryBrowser({accounts:created,db}),8);});
  await check('browser journeys preserve profiles and subscription fixture',async()=>{assert.deepEqual((await db.query('select * from smartcart_profiles order by id')).rows,baseline);assert.equal((await db.query('select status from smartcart_subscriptions')).rows[0].status,'disabled-fixture');});
 }
 const output={environment:'Loopback-only disposable PostgreSQL database, cached PostgREST and existing unlinked local GoTrue; no shared project',results,providerCalls:0,externalEmails:0,productionChanges:0};
 fs.writeFileSync('evals/allergy-library-local-integration.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({passed:results.length,failed:0,credentialsLogged:false,providerCalls:0,externalEmails:0}));
}finally{
 if(proxy)await new Promise(resolve=>proxy.close(resolve));
 if(started)docker(['stop',container]);
 if(db)await db.end();
 if(createdDB)docker(['exec','-i',dbInfo.Name.slice(1),'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',`drop database ${database}`]);
 for(const u of created){if(!u.email.startsWith('allergy-'+suffix+'-')||!u.email.endsWith('@example.invalid'))throw Error('Refuse cleanup of non-test identity');const r=await originalAuth.auth.admin.deleteUser(u.id);if(r.error)throw Error('Disposable local identity cleanup needs attention');}
 if(fs.existsSync(envFile))fs.unlinkSync(envFile);
}
