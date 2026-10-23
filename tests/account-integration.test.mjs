import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loader, withEnv } from './helpers/load-ts.mjs';
import { fixture as database, server, root, admin, free, stranger, issued } from './helpers/beta-onboarding-fixture.mjs';
const secret='isolated-account-integration-secret-at-least-32-chars';
const env={ACCOUNT_EXPERIENCE_ENABLED:'true',VERCEL_ENV:undefined,VERCEL:undefined,BETA_ONBOARDING_ENABLED:'true',BETA_RATE_LIMIT_SECRET:secret,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:54321',NEXT_PUBLIC_SUPABASE_ANON_KEY:'synthetic-only'};
const uid='33333333-3333-4333-8333-333333333333';
const token='R'.repeat(43);
const email='invited@example.invalid';
function fixture(options={}) {
 const calls=[];
 const auth={signInWithPassword:async input=>{calls.push(['password',input]);return options.badPassword?{error:{message:'No'},data:{}}:{error:null,data:{user:{id:uid,email_confirmed_at:'2026-01-01'},session:{access_token:'synthetic-access',refresh_token:'synthetic-refresh'}}};},signUp:async input=>{calls.push(['signup',input]);return{data:{session:options.immediateSession?{}:null},error:null};},resetPasswordForEmail:async(...input)=>{calls.push(['recover',input]);return{error:null};}};
 const adminClient={rpc:async(name,args)=>{calls.push([name,args]);return{data:options.rate!==false,error:null};},auth:{admin:{getUserById:async id=>({data:{user:{id,email}}})}},from:table=>{const q={select:()=>q,eq:(key,value)=>{calls.push(['lookup',table,key,value]);return q;},maybeSingle:async()=>({error:null,data:table==='account_usernames'?(options.unknown?null:{user_id:uid}):table==='beta_programs'?{onboarding_enabled:true,beta_ended_at:null,participation_limit_at:'2099-01-01'}:{state:options.state??'issued',bound_user_id:options.bound??null,expires_at:options.expired?'2020-01-01':'2099-01-01',beta_applications:{email,status:'invited'}}})};return q;}};
 const load=loader({'@supabase/supabase-js':{createClient:()=>({auth})},'./beta-server':{betaJson:(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}}),betaStorageClient:()=>adminClient,boundedJson:r=>r.json(),betaNetworkHash:()=> 'synthetic-network'},'node:timers/promises':{setTimeout:async()=>{}}});
 const cookie=load('lib/auth-intent.ts').sealIntent('/beta/accept',token,secret);
 const request=(body,{origin='http://localhost:3001',withCookie=true}={})=>new Request('http://localhost:3001/api/auth/credentials',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(withCookie?{Cookie:`mealcaddie_return=${cookie}`}:{})},body:JSON.stringify(body)});
 return{calls,request,post:load('lib/credential-server.ts').credentialPost};
}
test('password account feature fails closed in Production and never enables itself from a Preview flag alone',()=>{
 const {accountExperienceEnabled}=loader()('lib/account-experience.ts');
 assert.equal(accountExperienceEnabled({}),false);assert.equal(accountExperienceEnabled({ACCOUNT_EXPERIENCE_ENABLED:'true',VERCEL_ENV:'production'}),false);
 assert.equal(accountExperienceEnabled({ACCOUNT_EXPERIENCE_ENABLED:'true',VERCEL_ENV:'production',ACCOUNT_EXPERIENCE_RELEASE_APPROVED:'true'}),true);
});
test('returning username login resolves only server-side and returns a session after Supabase password verification',async()=>withEnv(env,async()=>{
 const f=fixture(),result=await f.post(f.request({action:'login',identifier:'test_user',password:'not-a-real-password'}));
 assert.equal(result.status,200);const body=await result.json();assert.ok(body.session.access_token);assert.equal(JSON.stringify(body).includes(email),false);
 assert.deepEqual(f.calls.find(v=>v[0]==='password')[1],{email,password:'not-a-real-password'});
 assert.equal(f.calls.some(v=>/grant|participation|subscription/.test(v[0])),false);
}));
test('unknown usernames and wrong passwords have identical generic failures and still call Auth',async()=>withEnv(env,async()=>{
 const responses=[];for(const options of [{unknown:true,badPassword:true},{badPassword:true}]){const f=fixture(options),r=await f.post(f.request({action:'login',identifier:'test_user',password:'wrong'}));assert.equal(r.status,401);responses.push(await r.json());assert.equal(f.calls.filter(c=>c[0]==='password').length,1);}assert.deepEqual(...responses);
}));
test('signup requires an unexpired invitation, exact recipient and no existing bound account, without granting participation',async()=>withEnv(env,async()=>{
 const valid={action:'register',email,username:'invited_tester',password:'disposable-password-123'};
 const f=fixture();assert.equal((await f.post(f.request(valid))).status,200);assert.equal(f.calls.filter(c=>c[0]==='signup').length,1);
 const proof=f.calls.find(c=>c[0]==='signup')[1].options.data.account_signup_permit;assert.match(proof,/^[A-Za-z0-9_-]{43}$/);assert.notEqual(proof,token);
 const permitHash=createHash('sha256').update(proof).digest('hex');assert.equal(f.calls.find(c=>c[0]==='account_prepare_signup')[1].p_permit_hash,permitHash);assert.equal(f.calls.find(c=>c[0]==='account_revoke_signup_permit')[1].p_permit_hash,permitHash);
 for(const [options,body,req] of [[{},valid,{withCookie:false}],[{expired:true},valid,{}],[{state:'consumed'},valid,{}],[{bound:uid},valid,{}],[{}, {...valid,email:'wrong@example.invalid'},{}]]){const invalid=fixture(options);assert.equal((await invalid.post(invalid.request(body,req))).status,200);assert.equal(invalid.calls.filter(c=>c[0]==='signup').length,0);}
 assert.equal(f.calls.some(v=>/accept_invitation|participation|grant|subscription/.test(v[0])),false);
}));
test('cross-origin, invalid schema and rate denial stop before password/signup provider calls',async()=>withEnv(env,async()=>{
 const body={action:'login',identifier:email,password:'not-real'};
 for(const [options,payload,req,status] of [[{},body,{origin:'https://evil.invalid'},403],[{}, {...body,plan:'plus'},{},400],[{rate:false},body,{},429]]){const f=fixture(options);assert.equal((await f.post(f.request(payload,req))).status,status);assert.equal(f.calls.some(c=>['password','signup'].includes(c[0])),false);}
}));
test('password recovery preserves the approved redirect and generic response without revealing account existence',async()=>withEnv(env,async()=>{
 const f=fixture();const response=await f.post(f.request({action:'recover',email}));assert.equal(response.status,200);assert.match((await response.json()).message,/If these details are eligible/);
 assert.equal(f.calls.find(c=>c[0]==='recover')[1][1].redirectTo,'http://localhost:3001/');
}));
test('household progress validates optional values and never accepts account/tier fields',()=>{
 const {householdPreferences,readHousehold}=loader()('lib/account-experience.ts');
 const draft=householdPreferences.parse({householdSize:4,availableEquipment:['Oven'],diet:'Vegan',step:1});assert.equal(draft.complete,false);assert.equal(draft.budget,null);
 assert.deepEqual(readHousehold({mealcaddie_household_v1:draft}),draft);assert.equal(readHousehold({mealcaddie_household_v1:{...draft,plan:'plus'}}).complete,false);
 for(const extra of [{user_id:uid},{plan:'plus'},{householdSize:0},{budget:-1},{availableEquipment:['Unknown']}])assert.equal(householdPreferences.safeParse({...draft,...extra}).success,false);
});
test('isolated username migration enforces verified ownership, uniqueness, browser denial and unchanged profiles',async()=>{
 const db=await database();try{
  await root(db);const before=(await db.query('select * from smartcart_profiles order by id')).rows;
  await db.exec(readFileSync('supabase/migrations/20261022210035_account_username_directory.sql','utf8'));
  await server(db);assert.equal((await db.query('select account_claim_username($1,$2) name',[free,'free_tester'])).rows[0].name,'free_tester');
  await assert.rejects(db.query('select account_claim_username($1,$2)',[stranger,'free_tester']),/unique/);
  assert.equal((await db.query('select account_claim_username($1,$2) name',[free,'different_name'])).rows[0].name,'free_tester');
  const unverified=randomUUID();await root(db);await db.query('insert into auth.users(id,email) values($1,$2)',[unverified,'unverified@example.invalid']);await server(db);await assert.rejects(db.query('select account_claim_username($1,$2)',[unverified,'unverified']),/verified/);
  for(const role of ['anon','authenticated']){await root(db);await db.exec('set role '+role);await assert.rejects(db.query('select * from account_usernames'),/permission/);await assert.rejects(db.query('select account_claim_username($1,$2)',[free,'spoofed']),/permission/);}
  await root(db);assert.deepEqual((await db.query('select * from smartcart_profiles order by id')).rows,before);
 }finally{await db.close();}
});
test('recipient review supports initially unbound invitations without weakening verified-account matching',async()=>withEnv({...env,BETA_PILOT_MODE:undefined},async()=>{
 const load=loader({'./beta-server':{betaJson:(body,status=200)=>Response.json(body,{status}),boundedJson:r=>r.json(),betaStorageClient:()=>({auth:{getUser:async()=>({data:{user:{id:uid,email,email_confirmed_at:'2026-01-01'}},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{state:'issued',bound_user_id:null,expires_at:'2099-01-01',beta_applications:{email,cohort:'plus',status:'invited'}},error:null})})})})})}});
 const result=await load('lib/beta-onboarding-server.ts').invitationReview(new Request('http://localhost:3001/api/beta/invitation-review',{method:'POST',headers:{Origin:'http://localhost:3001',Authorization:'Bearer synthetic','Content-Type':'application/json'},body:JSON.stringify({token})}));assert.equal(result.status,200);assert.equal((await result.json()).state,'ready');
}));
test('onboarding handoff preserves explicit restrictions under the unchanged production allergy guard',()=>{
 const load=loader(),{householdPlanDefaults,householdPreferences}=load('lib/account-experience.ts'),{foodSafetyResponse}=load('lib/food-safety-response.ts');
 const normal=householdPlanDefaults(householdPreferences.parse({householdSize:3,budget:90,diet:'Vegetarian',dislikes:'olives',availableEquipment:['Stovetop']}));
 assert.equal(normal.householdSize,'3');assert.equal(normal.budget,'90');assert.equal(normal.avoidIngredients,'olives');assert.equal(foodSafetyResponse(normal,true),null);
 for(const restrictions of ['Milk allergy','Sesame','Medical kidney diet','Unclear custom restriction'])assert.equal(foodSafetyResponse(householdPlanDefaults(householdPreferences.parse({restrictions})),true).status,422);
});
test('skipped onboarding answers clear prior planning defaults rather than inheriting another household',()=>{
 const {householdPlanDefaults,emptyHousehold}=loader()('lib/account-experience.ts');
 const next={householdSize:'6',budget:'240',availableEquipment:['Grill'],avoidIngredients:'previous household',...householdPlanDefaults(emptyHousehold())};
 assert.equal(next.householdSize,'');assert.equal(next.budget,'');assert.deepEqual(next.availableEquipment,[]);assert.equal(next.avoidIngredients,'');
});
test('authentication returns enter the planner once without redirecting an already settled planner',()=>{
 const {settledAuthDestination}=loader()('lib/auth-destination.ts');
 assert.equal(settledAuthDestination('/', '/'),'/planner');assert.equal(settledAuthDestination('/planner','/planner'),null);assert.equal(settledAuthDestination(null,'/planner'),null);assert.equal(settledAuthDestination('/admin/beta','/'),'/admin/beta');assert.equal(settledAuthDestination('https://evil.invalid','/'),'/planner');
});
test('recovery navigation hint is captured before the Auth SDK consumes a callback',()=>{
 const prior=global.window;
 try { global.window={location:{hash:'#type=recovery&access_token=synthetic-only'}};
 const api=loader({'@supabase/supabase-js':{createClient:()=>{global.window.location.hash='';return {};}}})('lib/supabase.ts');
 assert.equal(api.initialRecoveryCallback,true);assert.equal(global.window.location.hash,'');
 }finally{if(prior===undefined)delete global.window;else global.window=prior;}
});
test('password update requires a verified caller, exact origin and a bounded password-only payload',async()=>withEnv(env,async()=>{
 let writes=0;const saved=global.fetch;
 const api=loader({'./personalization-server':{personAccess:async r=>r.headers.has('authorization')?{user:{id:uid}}:{response:Response.json({error:'Sign in'},{status:401})}},'./beta-server':{betaJson:(body,status=200)=>Response.json(body,{status}),boundedJson:r=>r.json()}})('lib/household-server.ts');
 const request=(body,authorized=true,origin='http://localhost:3001')=>new Request('http://localhost:3001/api/auth/password',{method:'PUT',headers:{Origin:origin,'Content-Type':'application/json',...(authorized?{Authorization:'Bearer synthetic-owner'}:{})},body:JSON.stringify(body)});
 global.fetch=async(_url,init)=>{writes++;assert.equal(init.headers.Authorization,'Bearer synthetic-owner');assert.deepEqual(Object.keys(JSON.parse(init.body)),['password']);return Response.json({id:uid});};
 try{assert.equal((await api.passwordPut(request({password:'Synthetic-only-new-password!'},false))).status,401);assert.equal((await api.passwordPut(request({password:'short'}))).status,400);assert.equal((await api.passwordPut(request({password:'Synthetic-only-new-password!',plan:'plus'}))).status,400);assert.equal((await api.passwordPut(request({password:'Synthetic-only-new-password!'},true,'https://evil.invalid'))).status,403);assert.equal(writes,0);assert.equal((await api.passwordPut(request({password:'Synthetic-only-new-password!'}))).status,200);assert.equal(writes,1);}finally{global.fetch=saved;}
}));
test('account requests bind a setup draft to its captured owner before sending anything',async()=>{
 let owner='owner-b',sent=0;const saved=global.fetch;
 const client=loader({'./supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:owner},access_token:'synthetic-'+owner}},error:null})}}}})('lib/account-client.ts');
 global.fetch=async(_url,init)=>{sent++;assert.equal(init.headers.Authorization,'Bearer synthetic-owner-a');return Response.json({saved:true});};
 try{await assert.rejects(client.accountRequest('/api/account/onboarding',{step:1},'PUT','owner-a'),/account changed/);assert.equal(sent,0);owner='owner-a';assert.deepEqual(await client.accountRequest('/api/account/onboarding',{step:1},'PUT','owner-a'),{saved:true});assert.equal(sent,1);}finally{global.fetch=saved;}
});
test('household API writes only validated preferences through the caller token and preserves other metadata',async()=>withEnv(env,async()=>{
 const writes=[];const saved=global.fetch;
 const api=loader({'./personalization-server':{personAccess:async()=>({user:{id:uid,user_metadata:{preferred_name:'Kept'}}})},'./beta-server':{betaJson:(body,status=200)=>Response.json(body,{status}),boundedJson:r=>r.json()}})('lib/household-server.ts');
 const request=body=>new Request('http://localhost:3001/api/account/onboarding',{method:'PUT',headers:{Origin:'http://localhost:3001',Authorization:'Bearer synthetic-owner','Content-Type':'application/json'},body:JSON.stringify(body)});
 global.fetch=async(_url,init)=>{const body=JSON.parse(init.body);writes.push(body);assert.equal(init.headers.Authorization,'Bearer synthetic-owner');return Response.json({id:uid,user_metadata:{preferred_name:'Kept',...body.data}});};
 try{assert.equal((await api.householdPut(request({user_id:'victim',plan:'plus'}))).status,400);assert.equal(writes.length,0);const response=await api.householdPut(request({step:1,householdSize:3}));assert.equal(response.status,200);assert.deepEqual(Object.keys(writes[0].data),['mealcaddie_household_v1']);assert.equal((await response.json()).owner,uid);}finally{global.fetch=saved;}
}));
