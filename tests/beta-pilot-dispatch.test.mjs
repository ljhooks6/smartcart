import test from 'node:test';import assert from 'node:assert/strict';import {loader} from './helpers/load-local-ts.mjs';
const owner='b172ef8f-f5d7-4faa-abdf-f3250b2a6ef3';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const rows=[{id:ids[0],state:'queued',bound_user_id:'1ef00e74-4412-412c-a2c9-be2ec9c89348',application_id:'7257fef7-8da4-4d88-b538-29e229841143',beta_applications:{email:'mealcaddie@proton.me',cohort:'free',status:'approved',beta_consent_at:'2026-10-12'}},{id:ids[1],state:'queued',bound_user_id:'d8a775f8-bc36-4577-a6d1-b0934c4a3b88',application_id:'4eb2cc10-46a4-460c-9681-fad72a24afd1',beta_applications:{email:'elderrachel12@gmail.com',cohort:'plus',status:'approved',beta_consent_at:'2026-10-12'}}];
const env={VERCEL_ENV:'preview',BETA_PILOT_MODE:'true',BETA_PILOT_DISPATCH_APPROVED:'true',BETA_ONBOARDING_ENABLED:'true',BETA_INVITATION_DELIVERY_APPROVED:'true',BETA_PILOT_INVITATION_IDS:JSON.stringify(ids),BETA_PILOT_CONSENT_EMAILS:JSON.stringify(rows.map(r=>r.beta_applications.email)),BETA_PILOT_IDENTITIES:JSON.stringify(Object.fromEntries(rows.map(r=>[r.beta_applications.email,r.bound_user_id])))};
async function run(options={}){
 const old=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env,options.env);
 const originalTimer=globalThis.setTimeout;globalThis.setTimeout=callback=>{callback();return 0;};
 let sends=0,closed=0,reads=0;const selected=structuredClone(options.rows??rows);
 const client={from:table=>{reads++;if(table==='beta_invitations')return{select:()=>({in:async()=>({data:selected,error:null})})};if(table==='beta_programs')return{update:data=>({eq:async()=>{assert.deepEqual(data,{invitation_delivery_enabled:false});closed++;return{error:null};}})};if(table==='beta_program_events')return{insert:async()=>({error:null})};throw Error('Unrelated mutation');},auth:{admin:{getUserById:async id=>{const row=selected.find(r=>r.bound_user_id===id);return{data:{user:{id,email:row?.beta_applications.email,email_confirmed_at:options.unverified?null:'2026-01-01'}},error:null};}}}};
 const access=options.unauthorized?{response:Response.json({error:'Unauthorized'},{status:401})}:{client,user:{id:options.actor??owner}};
 const api=loader({'beta-onboarding-server':{onboardingAccess:async()=>access},'beta-server':{betaJson:(b,s=200)=>Response.json(b,{status:s}),boundedJson:r=>r.json()},'beta-invitation-delivery':{resendInvitationTransport:()=>{throw Error('Real provider must not run')},deliverOneInvitation:async()=>{sends++;return{status:options.unknown?'unknown':'accepted',id:ids[sends-1]};}}})('lib/beta-pilot-dispatch.ts');
 try{const response=await api.dispatchPilot(new Request('https://preview.example.invalid/api/beta/onboarding/pilot-dispatch',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify(options.body??{confirm:'send-authorized-two-person-pilot'})}));return{status:response.status,result:await response.json(),sends,closed,reads};}
 finally{globalThis.setTimeout=originalTimer;for(const k of Object.keys(env))if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
}
test('dispatch is Preview-only, separately gated, verified and restricted to the confirmed administrator',async()=>{
 for(const options of [{env:{VERCEL_ENV:'production'}},{env:{BETA_PILOT_DISPATCH_APPROVED:'false'}},{env:{BETA_PILOT_MODE:'false'}},{actor:'another-admin'},{unauthorized:true},{body:{confirm:'send-authorized-two-person-pilot',to:'evil@example.invalid'}}]){const r=await run(options);assert.ok(r.status>=400);assert.equal(r.sends,0);assert.equal(r.reads,0);}
});
test('exact verified consent/cohort/identity pairs dispatch at most two messages and always close sending without granting participation',async()=>{const r=await run();assert.equal(r.status,200);assert.equal(r.sends,2);assert.equal(r.closed,1);assert.equal(r.result.deliveryGateClosed,true);assert.equal(r.result.outcomes.length,2);});
test('wrong recipient, missing consent, altered cohort, duplicate IDs and unverified identity stop before provider work',async()=>{
 for(const mutate of [r=>r[0].beta_applications.email='evil@example.invalid',r=>r[0].beta_applications.beta_consent_at=null,r=>r[0].beta_applications.cohort='plus',r=>r[0].bound_user_id='another-user']){const changed=structuredClone(rows);mutate(changed);const r=await run({rows:changed});assert.equal(r.status,409);assert.equal(r.sends,0);assert.equal(r.closed,1);}
 for(const options of [{unverified:true},{env:{BETA_PILOT_INVITATION_IDS:JSON.stringify([ids[0],ids[0]])}}]){const r=await run(options);assert.equal(r.status,409);assert.equal(r.sends,0);assert.equal(r.closed,1);}
});
test('already issued invitations are not resent and an uncertain first delivery stops the second',async()=>{
 const issued=structuredClone(rows);issued.forEach(r=>r.state='issued');const existing=await run({rows:issued});assert.equal(existing.sends,0);assert.equal(existing.closed,1);
 const uncertain=await run({unknown:true});assert.equal(uncertain.status,409);assert.equal(uncertain.sends,1);assert.equal(uncertain.closed,1);
});
