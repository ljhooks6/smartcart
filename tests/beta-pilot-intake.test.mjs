import test from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './helpers/load-local-ts.mjs';
const first='11111111-1111-4111-8111-111111111111', second='22222222-2222-4222-8222-222222222222';
const settings={BETA_PILOT_MODE:'true',BETA_PILOT_INTAKE_ENABLED:'true',BETA_ONBOARDING_ENABLED:'true',VERCEL_ENV:'preview',VERCEL:'1',BETA_PILOT_IDENTITIES:JSON.stringify({'free@example.invalid':first,'plus@example.invalid':second})};
const body={email:'free@example.invalid',frequency:'weekly',challenges:'Actual disposable test planning answers',interests:['recipes'],planInterest:'either',feedbackWilling:true,betaConsent:true,marketingConsent:false,website:'',turnstileToken:'synthetic',source:'direct',campaign:''};
function env(values,run){const original=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);return Promise.resolve().then(run).finally(()=>{for(const k of Object.keys(values))if(original[k]===undefined)delete process.env[k];else process.env[k]=original[k];});}
function fixture({user={id:first,email:'free@example.invalid',email_confirmed_at:'2026-10-10'},rate=true,challenge=true,authError=null,existing=null}={}) {
 const calls=[];let challengeCalls=0;
 const client={auth:{getUser:async()=>({data:{user},error:authError})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:existing,error:null})})})}),rpc:async(name,args)=>{calls.push({name,args});return {data:name==='beta_check_rate'?rate:null,error:null};}};
 const api=loader({'beta-server':{betaStorageClient:()=>client,betaJson:(b,s=200)=>Response.json(b,{status:s}),boundedJson:r=>r.json(),betaNetworkHash:()=> 'synthetic-network-hash',verifyBetaChallenge:async()=>{challengeCalls++;return challenge;}}})('lib/beta-pilot-intake.ts');
 return {api,calls,get challengeCalls(){return challengeCalls;}};
}
function request(input=body,auth=true){return new Request('https://preview.example.invalid/api/beta/pilot-application',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer synthetic'}:{})},body:JSON.stringify(input)});}
test('pilot intake is preview-only and fail-closed regardless of public launch flags',async()=>env(settings,async()=>{
 const policy=loader()('lib/beta-pilot.ts');
 assert.equal(policy.pilotIntakeEnabled(settings),true);
 for(const changes of [{VERCEL_ENV:'production',BETA_PUBLIC_LAUNCH_APPROVED:'true'},{BETA_PILOT_INTAKE_ENABLED:'false'},{BETA_PILOT_MODE:'false'},{VERCEL_ENV:'development'}])assert.equal(policy.pilotIntakeEnabled({...settings,...changes}),false);
 const f=fixture();await env({BETA_PILOT_INTAKE_ENABLED:'false'},async()=>assert.equal((await f.api.pilotIntakePost(request())).status,404));assert.equal(f.calls.length,0);
}));
test('missing, invalid, unverified, anonymous, admin and mismatched UUID/email sessions cannot submit',async()=>env(settings,async()=>{
 for(const user of [null,{id:first,email:'free@example.invalid'}, {id:first,email:'free@example.invalid',email_confirmed_at:'yes',is_anonymous:true},{id:second,email:'free@example.invalid',email_confirmed_at:'yes'},{id:first,email:'admin@example.invalid',email_confirmed_at:'yes'}]){
  const f=fixture({user});const response=await f.api.pilotIntakePost(request());assert.ok([401,403].includes(response.status));assert.equal(f.calls.length,0);
 }
 const f=fixture();assert.equal((await f.api.pilotIntakePost(request(body,false))).status,401);assert.equal(f.calls.length,0);
 const invalid=fixture({authError:{status:401}});assert.equal((await invalid.api.pilotIntakePost(request())).status,401);assert.equal(invalid.calls.length,0);
}));
test('both allowed identities personally submit normal answers and separate consent; no email/grant/cohort RPC',async()=>env(settings,async()=>{
 for(const [id,email] of [[first,'free@example.invalid'],[second,'plus@example.invalid']]) {
  const f=fixture({user:{id,email,email_confirmed_at:'yes'}});assert.equal((await f.api.pilotIntakePost(request({...body,email}))).status,200);
  assert.deepEqual(f.calls.map(c=>c.name),['beta_check_rate','beta_submit_application']);assert.equal(f.challengeCalls,1);
  const saved=f.calls[1].args.p_input;assert.equal(saved.email,email);assert.equal(saved.beta_consent_version,'2026-10-10-v1');assert.equal(saved.marketing_consent,false);assert.equal(saved.campaign,'controlled-pilot');assert.equal(saved.plan_interest,'either');assert.equal(saved.cohort,undefined);
 }
}));
test('spoofed address/cohort, missing participation consent, failed Turnstile, honeypot and rate rejection never save',async()=>env(settings,async()=>{
 for(const [changes,status,opts] of [[{email:'plus@example.invalid'},403,{}],[{cohort:'plus'},400,{}],[{betaConsent:false},400,{}],[{},400,{challenge:false}],[{website:'bot'},200,{}],[{},429,{rate:false}]]) {
  const f=fixture(opts);const response=await f.api.pilotIntakePost(request({...body,...changes}));assert.equal(response.status,status);assert.equal(f.calls.some(c=>c.name==='beta_submit_application'),false);
 }
}));
test('status GET returns only the signed-in allowed identity application; cross-origin requests fail',async()=>env(settings,async()=>{
 const f=fixture({existing:{status:'applied',cohort:null,beta_consent_at:'2026-10-11'}});
 const response=await f.api.pilotIntakeGet(new Request('https://preview.example.invalid/api/beta/pilot-application',{headers:{Authorization:'Bearer synthetic'}}));
 assert.deepEqual(await response.json(),{email:'free@example.invalid',application:{status:'applied',cohort:null,beta_consent_at:'2026-10-11'}});
 const rejected=await f.api.pilotIntakePost(new Request('https://preview.example.invalid/api/beta/pilot-application',{method:'POST',headers:{Authorization:'Bearer synthetic',Origin:'https://evil.example.invalid','Content-Type':'application/json'},body:JSON.stringify(body)}));assert.equal(rejected.status,403);assert.equal(f.calls.length,0);
}));
