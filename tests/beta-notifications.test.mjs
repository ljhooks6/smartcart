import test from 'node:test';
import assert from 'node:assert/strict';
import {loader,withEnv} from './helpers/load-ts.mjs';
const id='11111111-1111-4111-8111-111111111111';
const enabled={VERCEL_ENV:'production',BETA_ADMIN_NOTIFICATIONS_ENABLED:'true',RESEND_API_KEY:'mock-not-a-real-key'};
function fixture(){
 let state='pending',attempts=0;const claims=[],finishes=[],updates=[];
 const client={rpc:async(name,args)=>{
  if(name==='beta_notification_claim'){claims.push(args);if(!['pending','retryable','blocked'].includes(state))return{data:null};state='sending';attempts++;return{data:{applicationId:id,leaseId:id,email:'new@example.invalid',submittedAt:'2026-10-13T18:00:00Z',interest:'plus'}};}
  if(name==='beta_notification_finish'){finishes.push(args);state=args.p_state;return{data:true};}throw Error('Unrelated database operation');
 },from:table=>{assert.equal(table,'beta_application_notifications');return{update:row=>({eq:()=>({in:async()=>{updates.push(row);state=row.state;return{error:null};}})}),select:()=>({eq:()=>({maybeSingle:async()=>({data:{state,attempts,next_attempt_at:new Date().toISOString()}})})})};}};
 const load=loader({'server-only':{},'./beta-server':{betaStorageClient:()=>client}});
 return {load,claims,finishes,updates,state:()=>state};
}
test('admin template has fixed production link, safe fields, exact sender and Central dates',()=>{
 const api=fixture().load('lib/beta-application-notifications.ts');
 const app={applicationId:id,leaseId:id,email:'<script>@example.invalid',submittedAt:'2026-10-13T18:00:00Z',interest:'either',challenges:'SECRET_QUESTIONNAIRE'};
 const email=api.prepareAdminApplicationEmail(app);
 assert.equal(email.to,'support@mealcaddie.app');assert.equal(email.from,'MealCaddie Beta <beta@mealcaddie.app>');assert.equal(email.subject,'New MealCaddie Beta Application Received');
 assert.match(email.html,/Review Application/);assert.match(email.html,/https:\/\/mealcaddie\.app\/admin\/beta/);assert.match(email.html,/1:00 PM.*Central Time/);assert.match(email.html,/Free or Plus/);assert.match(email.html,/Pending Review/);
 assert.doesNotMatch(email.html,/<script>|SECRET_QUESTIONNAIRE|preview\.mealcaddie|invite=|token=/);assert.match(email.html,/&lt;script&gt;/);
 assert.match(api.prepareAdminApplicationEmail({...app,submittedAt:'2026-12-01T18:00:00Z',interest:'free'}).text,/12:00 PM Central Time/);
});
test('worker is disabled in Preview or without explicit production activation',async()=>{
 for(const env of [{...enabled,VERCEL_ENV:'preview'},{...enabled,BETA_ADMIN_NOTIFICATIONS_ENABLED:undefined}])await withEnv(env,async()=>{const f=fixture();await f.load('lib/beta-application-notifications.ts').processAdminApplicationNotification(id);assert.equal(f.claims.length,0);});
});
test('concurrent work and repeated deliveries send one notification with stable idempotency',async()=>withEnv(enabled,async()=>{
 const f=fixture(),old=global.fetch,calls=[];global.fetch=async(url,options)=>{calls.push({url,options});return Response.json({id:'provider-one'});};
 try{const api=f.load('lib/beta-application-notifications.ts');await Promise.all(Array.from({length:10},()=>api.processAdminApplicationNotification(id)));await api.processAdminApplicationNotification(id);assert.equal(calls.length,1);assert.equal(calls[0].options.headers['Idempotency-Key'],'beta-admin-application/'+id);assert.equal(JSON.parse(calls[0].options.body).to,'support@mealcaddie.app');assert.equal(f.state(),'sent');assert.equal(f.finishes[0].p_provider,'provider-one');}finally{global.fetch=old;}
}));
test('timeouts and server errors are uncertain and never automatically resent',async()=>withEnv(enabled,async()=>{
 for(const outcome of ['timeout','server']){const f=fixture(),old=global.fetch;let calls=0;global.fetch=async()=>{calls++;if(outcome==='timeout')throw Error('mock timeout');return new Response('provider body must not be logged',{status:500});};
 try{const api=f.load('lib/beta-application-notifications.ts');await api.processAdminApplicationNotification(id);await api.processAdminApplicationNotification(id);assert.equal(calls,1);assert.equal(f.state(),'uncertain');}finally{global.fetch=old;}}
}));
test('confirmed 429 rejection permits bounded retry with the same provider key',async()=>withEnv(enabled,async()=>{
 const f=fixture(),old=global.fetch,keys=[];global.fetch=async(url,options)=>{keys.push(options.headers['Idempotency-Key']);return keys.length===1?new Response(null,{status:429}):Response.json({id:'provider-after-rate-limit'});};
 try{const api=f.load('lib/beta-application-notifications.ts');await assert.rejects(api.processAdminApplicationNotification(id),api.NotificationRetry);assert.equal(f.state(),'retryable');await api.processAdminApplicationNotification(id);assert.deepEqual(keys,[keys[0],keys[0]]);assert.equal(f.state(),'sent');}finally{global.fetch=old;}
}));
test('missing Resend config leaves a recoverable outbox without a provider request',async()=>withEnv({...enabled,RESEND_API_KEY:undefined},async()=>{
 const f=fixture(),old=global.fetch;global.fetch=()=>{throw Error('provider must not be called');};
 try{const api=f.load('lib/beta-application-notifications.ts');await assert.rejects(api.processAdminApplicationNotification(id),api.NotificationRetry);assert.equal(f.claims.length,0);assert.equal(f.state(),'blocked');assert.equal(f.updates[0].error_code,'missing_configuration');}finally{global.fetch=old;}
}));
test('only successful persistence schedules notification; scheduling failure cannot change success',async()=>{
 const body={email:'new@example.invalid',frequency:'weekly',challenges:'A disposable planning challenge',interests:['recipes'],planInterest:'plus',feedbackWilling:true,betaConsent:true,marketingConsent:false,turnstileToken:'valid',source:'direct'};
 const env={BETA_APPLICATIONS_ENABLED:'true',VERCEL:undefined,VERCEL_ENV:undefined};
 await withEnv(env,async()=>{for(const situation of ['valid','schedule_failure','invalid','spam','challenge_rejected','storage_failure','rate_limited']){
  const trace=[];let scheduled=0;const load=loader({'@/lib/beta-server':{betaStorageClient:()=>({rpc:async(name)=>{trace.push(name);return{data:name==='beta_check_rate'?situation!=='rate_limited':null,error:name==='beta_submit_application'&&situation==='storage_failure'?{}:null};}}),betaJson:(data,status=200)=>Response.json(data,{status}),betaNetworkHash:()=> 'mock',boundedJson:async()=>situation==='invalid'?{...body,betaConsent:false}:situation==='spam'?{...body,website:'bot'}:body,verifyBetaChallenge:async()=>situation!=='challenge_rejected'},'@/lib/beta-notification-dispatch':{notifyAfterApplicationSave:()=>{scheduled++;assert.equal(trace.at(-1),'beta_submit_application');if(situation==='schedule_failure')throw Error('scheduler failure');}}});
  const response=await load('app/api/beta/applications/route.ts').POST(new Request('https://example.invalid/api/beta/applications',{method:'POST'}));assert.equal(scheduled,['valid','schedule_failure'].includes(situation)?1:0);if(['valid','schedule_failure'].includes(situation))assert.equal(response.status,200);
 }});
});
test('duplicate persisted applications without a pending outbox never publish notification jobs',async()=>withEnv(enabled,async()=>{
 for(const state of [null,'sent','uncertain']){const callbacks=[],published=[];
 const client={from:table=>({select:()=>({eq:()=>({eq:()=>({maybeSingle:async()=>({data:{id}})}),maybeSingle:async()=>({data:state?{state}:null})})})})};
 const load=loader({'./beta-server':{betaStorageClient:()=>client},'./beta-application-notifications':{adminNotificationsEnabled:()=>true},'next/server':{after:callback=>callbacks.push(callback)},'@vercel/queue':{send:async(...args)=>published.push(args)}});
 load('lib/beta-notification-dispatch.ts').notifyAfterApplicationSave('existing@example.invalid');await callbacks[0]();assert.equal(published.length,0);
 }
}));
test('notification recovery endpoints reject signed-out/non-admin users before reading records',async()=>{
 for(const status of [401,403]){let reads=0;const load=loader({'@/lib/beta-server':{requireBetaAdmin:async()=>({response:Response.json({error:'denied'},{status})}),betaJson:(body,s=200)=>Response.json(body,{status:s}),betaStorageClient:()=>{reads++;throw Error('private data must not be read');}},'@/lib/beta-application-notifications':{adminNotificationsEnabled:()=>true},'@/lib/beta-notification-dispatch':{}});
 const api=load('app/api/beta/admin/notifications/route.ts');assert.equal((await api.GET(new Request('https://mealcaddie.app/api/beta/admin/notifications'))).status,status);assert.equal((await api.POST(new Request('https://mealcaddie.app/api/beta/admin/notifications',{method:'POST'}))).status,status);assert.equal(reads,0);}
});
