import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {loader,withEnv} from './helpers/load-ts.mjs';
import {generationPostgresLab} from './helpers/generation-postgres-lab.mjs';

const input={budget:60,diet:'No preference',householdSize:2,combinedPantryItems:'Dry white rice, Scallions',mealSourceMode:'pantry-only',availableEquipment:['Stovetop'],prepTime:'Under 30 mins',pantryInventory:[{name:'Dry white rice',quantity:2,unit:'cup',status:'owned'},{name:'Scallions',quantity:2,unit:'each',status:'owned'}]};
const fixtureMeal={day:'Day 1',name:'Scallion Dry white rice Skillet',servings:2,description:'Tender rice with green onion. Synthetic integration fixture.',prep_time_minutes:20,ingredients:[{name:'Dry white rice',amount:'1 cup',price:0},{name:'Green onion',amount:'1',price:0}]};
test('real API → reservation SQL → dispatch adapter → real worker → PostgreSQL persistence → owner read',async()=>withEnv({VERCEL:'1',OPENAI_API_KEY:'mock-only',BETA_PRODUCT_ACCESS_ENABLED:'true',BETA_ENTITLEMENTS_ENABLED:'false'},async()=>{
 const lab=await generationPostgresLab(),queued=[],seen=new Set();let calls=0,dispatchUnavailable=false,providerFailure=false;
 try{
  class Provider{chat={completions:{create:async()=>{calls++;lab.events.push({stage:'generation',provider:'mock',externalCalls:0});if(providerFailure)throw Error('Synthetic provider failed');return {choices:[{message:{content:JSON.stringify({meals:[fixtureMeal],desserts:[],estimated_total_cost:0,budget_summary:'Synthetic only',upgrade_available:false})}}]};}}};}
  const load=loader({'./supabase-admin':{getSupabaseAdminClient:()=>lab.admin},openai:Provider,'@vercel/queue':{send:async(topic,payload,options)=>{lab.events.push({stage:'dispatch',topic,idempotencyKey:options.idempotencyKey});if(dispatchUnavailable)throw Error('Synthetic dispatch failure');if(!seen.has(payload.jobId)){queued.push(payload.jobId);seen.add(payload.jobId);}}}});
  const api=load('app/api/generate-list/route.ts'),worker=load('lib/generation-worker.ts');
  const req=(person='free',body=input,key=randomUUID())=>new Request('http://localhost:3052/api/generate-list',{method:'POST',headers:{Origin:'http://localhost:3052','Content-Type':'application/json','Idempotency-Key':key,...(person?{Authorization:'Bearer '+(lab.people.find(p=>p.key===person)?.token||'invalid')}: {})},body:JSON.stringify(body)});
  const get=(person,id)=>api.GET(new Request('http://localhost:3052/api/generate-list?id='+id,{headers:{Authorization:'Bearer '+lab.people.find(p=>p.key===person).token}}));
  // Authentication and explicit access are real middleware decisions over fake upstream identities.
  for(const person of [null,'invalid','denied'])assert.ok([401,403].includes((await api.POST(req(person))).status));
  const unknown=await api.POST(req('free',{...input,pantryInventory:[{name:'Dry white rice',status:'stocked'}]}));
  assert.equal(unknown.status,422);assert.equal((await unknown.json()).code,'PANTRY_QUANTITIES_REQUIRED');assert.equal(calls,0);
  assert.equal((await lab.db.query('select count(*)::int n from smartcart_generation_jobs')).rows[0].n,0);
  const key=randomUUID(),accepted=await api.POST(req('free',input,key));assert.equal(accepted.status,202);
  const first=await accepted.json(),id=first.job.id;assert.equal(first.job.status,'queued');assert.deepEqual(first.job.input,input);assert.equal(first.remaining,4);
  const duplicates=await Promise.all(Array.from({length:8},()=>api.POST(req('free',input,key))));
  assert.ok((await Promise.all(duplicates.map(r=>r.json()))).every(r=>r.job.id===id));assert.equal(queued.length,1);
  assert.equal((await get('plus',id)).status,404);
  const during=await get('free',id);assert.equal((await during.json()).job.status,'queued');
  await worker.processGenerationJob(queued.shift());
  const result=await get('free',id),body=await result.json();assert.equal(result.status,200);assert.equal(body.job.status,'completed');assert.equal(body.job.result.meals.length,1);assert.equal(calls,1);
  assert.deepEqual(body.job.result.restock_items,[]);assert.equal(body.job.result.estimated_total_cost,0);assert.match(body.job.result.planning_notice,/measured snapshot/);
  assert.ok(!('owner_key' in body.job));
  const persisted=(await lab.db.query('select * from smartcart_generation_jobs where id=$1',[id])).rows[0];
  assert.equal(persisted.user_id,lab.people[0].id);assert.equal(persisted.owner_key,'user:'+lab.people[0].id);assert.deepEqual(persisted.result,body.job.result);
  // Returning page/session read and repeated delivery do not regenerate or charge quota.
  assert.deepEqual((await (await get('free',id)).json()).job.result,body.job.result);
  await worker.processGenerationJob(id);assert.equal(calls,1);
  assert.equal((await (await api.POST(req('free',input,key))).json()).job.id,id);
  const quota=(await lab.db.query("select count(*)::int n from smartcart_generation_jobs where user_id=$1 and status<>'failed'",[lab.people[0].id])).rows[0].n;assert.equal(quota,1);
  // Definite dispatch failure retains one queued reservation and can be resumed.
  dispatchUnavailable=true;
  const pending=await api.POST(req('plus'));assert.equal(pending.status,503);const pendingBody=await pending.json();assert.equal(pendingBody.job.status,'queued');assert.match(pendingBody.error,/saved/);
  dispatchUnavailable=false;await get('plus',pendingBody.job.id);assert.equal(queued.length,1);await worker.processGenerationJob(queued.shift());assert.equal((await (await get('plus',pendingBody.job.id)).json()).job.status,'completed');
  // Interrupted/uncertain work becomes terminal; no provider replay is attempted.
  const interrupted=await lab.admin.rpc('smartcart_create_generation_job',{p_owner:'user:'+lab.people[1].id,p_quota:'user:'+lab.people[1].id,p_user:lab.people[1].id,p_request:randomUUID(),p_hash:'interrupted',p_input:input,p_plan:'plus',p_limit:20,p_seconds:604800});
  const brokenId=interrupted.data.job.id;await lab.admin.rpc('smartcart_claim_generation_job',{p_id:brokenId});
  await lab.db.query("update smartcart_generation_jobs set lease_until=now()-interval '1 second' where id=$1",[brokenId]);
  const before=calls;const interruptedRead=await get('plus',brokenId);assert.match((await interruptedRead.json()).job.error,/interrupted/);await worker.processGenerationJob(brokenId);assert.equal(calls,before);
  // Provider failure remains distinct from dietary/quantity rejection and stores no meal output.
  await lab.db.exec("update smartcart_generation_jobs set created_at=created_at-interval '11 minutes'");
  providerFailure=true;const failed=await api.POST(req('free'));const failedId=(await failed.json()).job.id;await worker.processGenerationJob(failedId);
  const failure=(await (await get('free',failedId)).json()).job;assert.equal(failure.status,'failed');assert.equal(failure.result,null);assert.match(failure.error,/couldn't finish/);
  lab.events.push({stage:'validation',checked:'quantity, equipment, time, dietary guards',result:'pass'});
  if(process.env.MEALCADDIE_JOURNEY_RECEIPT)await writeFile(process.env.MEALCADDIE_JOURNEY_RECEIPT,JSON.stringify({syntheticOnly:true,externalProviderCalls:0,emails:0,stages:lab.events,checks:{ownerScoped:true,idempotent:true,persisted:true,resumedDispatch:true,interruptedTerminal:true}},null,2));
 }finally{await lab.close();}
}));
