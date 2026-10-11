import test from 'node:test'; import assert from 'node:assert/strict'; import {createHash,randomUUID} from 'node:crypto';
import {fixture,admin,free,plus,paid,root,server,browser} from './helpers/beta-onboarding-fixture.mjs';
import {loader} from './helpers/load-local-ts.mjs';

test('restricted API intake to real disposable PostgreSQL, explicit admin review, Free/Plus acceptance and feedback',async()=>{
 const db=await fixture();
 const config={BETA_PILOT_MODE:'true',BETA_PILOT_INTAKE_ENABLED:'true',BETA_ONBOARDING_ENABLED:'true',BETA_ENTITLEMENTS_ENABLED:'true',VERCEL_ENV:'preview',VERCEL:'1',BETA_PILOT_IDENTITIES:JSON.stringify({'free@example.invalid':free,'plus@example.invalid':plus})};
 const previous=Object.fromEntries(Object.keys(config).map(k=>[k,process.env[k]]));Object.assign(process.env,config);
 let user={id:free,email:'free@example.invalid',email_confirmed_at:'2026-10-10'};
 const whitelist=['beta_check_rate','beta_submit_application','beta_onboarding_rate','beta_accept_invitation','beta_submit_feedback'];
 const client={auth:{getUser:async()=>({data:{user},error:null})},rpc:async(name,args)=>{
   assert.ok(whitelist.includes(name));await server(db);const values=Object.values(args).map(v=>typeof v==='object'?JSON.stringify(v):v);
   try{return {data:(await db.query(`select ${name}(${values.map((_,i)=>'$'+(i+1)).join(',')}) as result`,values)).rows[0].result,error:null};}catch(error){return {data:null,error:{message:error.message}};}
 }};
 const stubs={'beta-server':{betaStorageClient:()=>client,betaJson:(b,s=200)=>Response.json(b,{status:s}),boundedJson:r=>r.json(),betaNetworkHash:()=> 'a'.repeat(64),verifyBetaChallenge:async()=>true}};
 const intake=loader(stubs)('lib/beta-pilot-intake.ts');const api=loader(stubs)('lib/beta-onboarding-server.ts');
 const request=(body)=>new Request('https://preview.example.invalid/api/beta/pilot-application',{method:'POST',headers:{Authorization:'Bearer disposable','Content-Type':'application/json'},body:JSON.stringify(body)});
 try {
  for(const [id,email,cohort,token] of [[free,'free@example.invalid','free','F'.repeat(43)],[plus,'plus@example.invalid','plus','P'.repeat(43)]]){
   user={id,email,email_confirmed_at:'2026-10-10'};
   const answers={email,frequency:'weekly',challenges:'Disposable participant answers to normal intake',interests:['recipes'],planInterest:cohort,feedbackWilling:true,betaConsent:true,marketingConsent:false,website:'',turnstileToken:'disposable-test',source:'direct',campaign:''};
   assert.equal((await intake.pilotIntakePost(request(answers))).status,200);
   let a=(await db.query('select *,updated_at::text expected from beta_applications where email=$1',[email])).rows[0];
   assert.equal(a.status,'applied');assert.equal(a.cohort,null);assert.equal(a.marketing_consent,false);assert.equal(a.beta_consent_version,'2026-10-10-v1');
   assert.equal((await intake.pilotIntakePost(request({...answers,challenges:'Duplicate must not replace the original answers',marketingConsent:true}))).status,200);
   const duplicate=(await db.query('select * from beta_applications where email=$1',[email])).rows[0];assert.equal(duplicate.challenges,answers.challenges);assert.equal(duplicate.marketing_consent,false);
   await assert.rejects(db.query("select beta_update_application($1,$2,'approved',$3,$4)",[admin,a.id,cohort,a.expected]),/transition/);
   for(const status of ['under_review','approved']){await db.query('select beta_update_application($1,$2,$3,$4,$5)',[admin,a.id,status,cohort,a.expected]);a=(await db.query('select *,updated_at::text expected from beta_applications where id=$1',[a.id])).rows[0];}
   await assert.rejects(db.query("select beta_update_application($1,$2,'under_review',$3,$4)",[admin,a.id,cohort,duplicate.updated_at]),/stale/);
   assert.equal((await db.query('select count(*)::int n from beta_participations where user_id=$1',[id])).rows[0].n,0);
   const invitation=(await db.query('select beta_issue_invitation($1,$2) id',[admin,a.id])).rows[0].id;
   await root(db);await db.exec("update beta_invitation_deliveries set attempted_at=now()-interval '6 seconds' where attempted_at is not null");await server(db);
   const claimed=(await db.query('select beta_claim_delivery($1) result',[createHash('sha256').update(token).digest('hex')])).rows[0].result;assert.equal(claimed.id,invitation);
   await db.query('select beta_finish_delivery($1,$2,$3)',[invitation,'accepted','mock-provider-'+randomUUID()]);
   const accept={action:'accept',token,consent:true};assert.equal((await api.participantPost(request(accept))).status,200);assert.equal((await api.participantPost(request(accept))).status,200);
   assert.equal((await db.query('select count(*)::int n from beta_participations where user_id=$1',[id])).rows[0].n,1); // Same-user retries are idempotent, not a second grant.
   assert.equal((await db.query('select beta_effective_plan($1) plan',[id])).rows[0].plan,cohort);assert.equal((await db.query('select plan from smartcart_profiles where id=$1',[id])).rows[0].plan,'free');
   assert.equal((await api.participantPost(request({action:'feedback',category:'usability',feature:'onboarding',message:'Disposable feedback with optional analytics disabled',requestKey:randomUUID()}))).status,200);
  }
  const feedback=(await db.query('select * from beta_feedback')).rows;assert.equal(feedback.length,2);
  await db.query("select beta_review_feedback($1,$2,'triaged','Disposable review')",[admin,feedback[0].id]);
  assert.equal((await db.query('select count(*)::int n from beta_participations where engagement_consent')).rows[0].n,0);
  assert.equal((await db.query('select beta_effective_plan($1) plan',[paid])).rows[0].plan,'plus');
  await browser(db,plus);await db.query('insert into archived_meals(user_id,name) values($1,$2)',[plus,'Retained pilot meal']);
  await root(db);await db.exec("update beta_participations set activated_at=now()-interval '31 days',expires_at=now()-interval '1 second' where cohort='plus'");await server(db);
  assert.equal((await db.query('select beta_effective_plan($1) plan',[plus])).rows[0].plan,'free');
  await root(db);
  assert.equal((await db.query('select count(*)::int n from archived_meals')).rows[0].n,1);
  assert.equal((await db.query('select status from smartcart_subscriptions')).rows[0].status,'active');
 } finally {await db.close();for(const k of Object.keys(config))if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];}
});
