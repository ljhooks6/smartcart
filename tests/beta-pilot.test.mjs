import test from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './helpers/load-local-ts.mjs';
const first='11111111-1111-4111-8111-111111111111', second='22222222-2222-4222-8222-222222222222';
const policy={BETA_PILOT_MODE:'true',BETA_PILOT_IDENTITIES:JSON.stringify({'new@example.invalid':null,'existing@example.invalid':first})};
test('pilot activation requires verified UUID/email pair; unknown/new/admin identities fail closed',()=>{
 const p=loader()('lib/beta-pilot.ts');
 assert.equal(p.pilotIdentityAllowed(first,'existing@example.invalid',policy),true);
 for(const [id,email] of [[second,'existing@example.invalid'],[first,'new@example.invalid'],[first,'admin@example.invalid'],[first,undefined]])assert.equal(p.pilotIdentityAllowed(id,email,policy),false);
 for(const config of ['{}','null','[]','bad','{"existing@example.invalid":"spoofed"}']) assert.equal(p.pilotIdentityAllowed(first,'existing@example.invalid',{...policy,BETA_PILOT_IDENTITIES:config}),false);
 assert.equal(p.pilotIdentityAllowed(first,'existing@example.invalid',{...policy,BETA_PILOT_IDENTITIES:JSON.stringify({'new@example.invalid':second,'existing@example.invalid':first})}),true);
});
test('pilot invitations require separate recipient consent and exact invitation authorization',()=>{
 const p=loader()('lib/beta-pilot.ts'); const ready={...policy,BETA_PILOT_CONSENT_EMAILS:JSON.stringify(['existing@example.invalid']),BETA_PILOT_INVITATION_IDS:JSON.stringify([second])};
 assert.equal(p.pilotInvitationApproved(second,'existing@example.invalid',ready),true);
 assert.equal(p.pilotInvitationApproved(first,'existing@example.invalid',ready),false);
 assert.equal(p.pilotInvitationApproved(second,'admin@example.invalid',ready),false);
 assert.equal(p.pilotInvitationApproved(second,'existing@example.invalid',policy),false);
 assert.equal(p.pilotInvitationApproved(second,'existing@example.invalid',{...ready,BETA_PILOT_CONSENT_EMAILS:'bad'}),false);
});
test('pilot worker rejects unconsented/unapproved queue before claiming or sending, and checks raced claims',async()=>{
 const {deliverOneInvitation}=loader()('lib/beta-invitation-delivery.ts');
 const env={...policy,BETA_ONBOARDING_ENABLED:'true',VERCEL_ENV:'preview',BETA_INVITATION_DELIVERY_APPROVED:'true',BETA_INVITATION_ORIGIN:'https://preview.example.invalid',BETA_EMAIL_CAPACITY_REVIEW_DATE:new Date().toISOString().slice(0,10),BETA_EMAIL_DAILY_HEADROOM:'30',BETA_PILOT_CONSENT_EMAILS:JSON.stringify(['existing@example.invalid']),BETA_PILOT_INVITATION_IDS:JSON.stringify([second])};
 for(const scenario of ['unapproved','unconsented','race','approved']){
  const calls=[];let sends=0;
  const client={from:()=>({select:()=>({eq:()=>({limit:async()=>({data:[{id:second,beta_applications:{email:scenario==='unapproved'?'wrong@example.invalid':'existing@example.invalid'}}],error:null})})})}),rpc:async(name,args)=>{calls.push({name,args});return{data:name==='beta_claim_delivery'?{id:scenario==='race'?first:second,email:'existing@example.invalid',idempotency_key:'synthetic-key'}:null,error:null};}};
  const transport=async()=>{sends++;return{id:'synthetic-provider'};};
  if(scenario==='approved')assert.equal((await deliverOneInvitation(client,transport,env)).status,'accepted');
  else await assert.rejects(deliverOneInvitation(client,transport,scenario==='unconsented'?{...env,BETA_PILOT_CONSENT_EMAILS:'[]'}:env),/Pilot/);
  assert.equal(sends,scenario==='approved'?1:0);
  if(scenario==='unapproved'||scenario==='unconsented')assert.equal(calls.length,0);
  if(scenario==='race')assert.equal(calls.at(-1).args.p_status,'unknown');
 }
});
test('pilot API rejects a verified but unapproved identity before mutation even if activation gate is enabled',async()=>{
 const keys=['BETA_ONBOARDING_ENABLED','BETA_ENTITLEMENTS_ENABLED','VERCEL_ENV',...Object.keys(policy)];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{...policy,BETA_ONBOARDING_ENABLED:'true',BETA_ENTITLEMENTS_ENABLED:'true',VERCEL_ENV:'preview'});
 try{let mutations=0;const client={auth:{getUser:async()=>({data:{user:{id:first,email:'wrong@example.invalid',email_confirmed_at:new Date().toISOString()}},error:null})},rpc:async()=>{mutations++;return{error:null};}};
 const api=loader({'beta-server':{betaStorageClient:()=>client,betaJson:(body,status=200)=>Response.json(body,{status}),boundedJson:r=>r.json()}})('lib/beta-onboarding-server.ts');
 const response=await api.participantPost(new Request('https://preview.example.invalid/api/beta/onboarding',{method:'POST',headers:{Authorization:'Bearer synthetic','Content-Type':'application/json'},body:JSON.stringify({action:'accept',token:'A'.repeat(43),consent:true})}));
 assert.equal(response.status,403);assert.equal(mutations,0);
 }finally{for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
});
