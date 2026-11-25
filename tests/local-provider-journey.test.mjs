import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import OpenAI from 'openai';
import {generationPostgresLab} from './helpers/generation-postgres-lab.mjs';
import {loader,withEnv} from './helpers/load-ts.mjs';
import {createBoundedProvider,openAttemptBudget} from './helpers/provider-attempt-budget.mjs';
import {authorizeLocalJob,measuredFixture,inventoryKey} from './helpers/local-real-provider-scope.mjs';

test('fixture scope accepts reviewed garlic-clove identity but not garlic powder or altered stock',()=>{
 const item=name=>[{name,quantity:12,unit:'clove',status:'owned'}];
 assert.equal(inventoryKey(item('Garlic')),inventoryKey(item('Garlic cloves')));
 assert.notEqual(inventoryKey(item('Garlic')),inventoryKey(item('Garlic powder')));
 assert.notEqual(inventoryKey(item('Garlic')),inventoryKey([{...item('Garlic')[0],quantity:13}]));
});

test('actual SDK and worker cross the bounded bridge; stock, persistence and recipe share one durable budget',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mc-live-bridge-'));const lab=await generationPostgresLab();const gateErrors=[];
 fs.writeFileSync(path.join(dir,'attempts.json'),JSON.stringify({version:1,state:'prepared',attempts:[]}));const budget=openAttemptBudget(dir);budget.arm();let simulatedUpstream=0;
 const forms={Rice:'Dry white rice','Black beans':'Cooked black beans',Chickpeas:'Cooked chickpeas'};
 const fixture=measuredFixture.map(([name,...rest])=>[forms[name]??name,...rest]);
 const meal={name:'Chickpea Rice Skillet',day:'Day 1',servings:2,description:'Tender rice and chickpeas with sweet onion. Synthetic recipe fixture.',prep_time_minutes:30,ingredients:[{name:'Dry white rice',amount:'1 cup',price:0},{name:'Cooked chickpeas',amount:'1 cup',price:0},{name:'Water',amount:'2 cups',price:0},{name:'Olive oil',amount:'1 tbsp',price:0},{name:'Onions',amount:'1',price:0}]};
 const handle=createBoundedProvider({budget,authorize:prepared=>authorizeLocalJob({budget,lab,prepared,fixture}),transport:async request=>{
  simulatedUpstream++;
  const result=request.model==='gpt-4.1'?{meals:[meal],desserts:[],estimated_total_cost:0,budget_summary:'Synthetic measured stock',upgrade_available:false}:{prep_time_minutes:30,actions:[{action:'mix',ingredientIds:[0,1,2,3,4],minutes:5},{action:'simmer',ingredientIds:[0,1,2,3,4],minutes:20},{action:'serve',ingredientIds:[0,1,2,3,4],minutes:5}]};
  return Response.json({id:'mock_'+randomUUID(),object:'chat.completion',model:request.model,choices:[{index:0,message:{role:'assistant',content:JSON.stringify(result)},finish_reason:'stop'}],usage:{prompt_tokens:100,completion_tokens:100,total_tokens:200}},{headers:{'x-request-id':'req_mock'}});
 }});
 const server=http.createServer(async(req,res)=>{try{let text='';for await(const c of req)text+=c;const answer=await handle(JSON.parse(text));res.writeHead(answer.status,{'Content-Type':'application/json'});res.end(JSON.stringify(answer.body));}catch(error){gateErrors.push(error.code||error.constructor.name);res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:error.code||'LOCAL_GATE'}}));}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{await withEnv({OPENAI_API_KEY:'local-broker-not-provider-key',OPENAI_BASE_URL:'http://127.0.0.1:'+server.address().port+'/v1',VERCEL:'1',BETA_PRODUCT_ACCESS_ENABLED:'true',BETA_ENTITLEMENTS_ENABLED:'false'},async()=>{
  const origin='http://127.0.0.1:'+server.address().port;
  class LocalSDK extends OpenAI{constructor(options){super({...options,baseURL:origin+'/v1',fetch:async(url,init)=>{assert.equal(new URL(url).origin,origin,'Tests must not reach a hosted provider');if(process.env.MEALCADDIE_TEST_HTTP!=='1'){const answer=await handle(JSON.parse(init.body));return Response.json(answer.body,{status:answer.status});}try{return await fetch(url,init);}catch(error){gateErrors.push(error.cause?.code||error.code||error.constructor.name);throw error;}}});}}
  const queue=[];const load=loader({'./supabase-admin':{getSupabaseAdminClient:()=>lab.admin},openai:LocalSDK,'@vercel/queue':{send:async(_topic,payload)=>queue.push(payload.jobId)}});
  const api=load('app/api/generate-list/route.ts'),worker=load('lib/generation-worker.ts'),recipe=load('app/api/get-recipe/route.ts');
  const input={budget:60,diet:'No preference',householdSize:2,mealSourceMode:'pantry-only',combinedPantryItems:fixture.map(x=>x[0]).join(', '),pantryInventory:fixture.map(([name,quantity,unit])=>({name,quantity,unit,status:'owned'})),availableEquipment:['Stovetop'],prepTime:'Under 1 hour'};
  const headers={'Content-Type':'application/json',Origin:'http://localhost:3052',Authorization:'Bearer '+lab.people[0].token,'Idempotency-Key':randomUUID()};
  const accepted=await api.POST(new Request('http://localhost:3052/api/generate-list',{method:'POST',headers,body:JSON.stringify(input)}));assert.equal(accepted.status,202);const id=(await accepted.json()).job.id;assert.deepEqual(queue,[id]);
  await worker.processGenerationJob(id);
  const get=()=>api.GET(new Request('http://localhost:3052/api/generate-list?id='+id,{headers}));
  const persisted=(await (await get()).json()).job;assert.equal(persisted.status,'completed',JSON.stringify({error:persisted.error,gateErrors,simulatedUpstream,attempts:budget.read().attempts}));assert.equal(persisted.result.meals[0].servings,2);assert.equal(persisted.result.estimated_total_cost,0);assert.deepEqual(persisted.result.restock_items,[]);assert.deepEqual((await (await get()).json()).job.result,persisted.result);assert.equal(simulatedUpstream,1);
  const recipeResult=await recipe.POST(new Request('http://localhost:3052/api/get-recipe',{method:'POST',headers,body:JSON.stringify({mealTitle:persisted.result.meals[0].name,diet:input.diet,originalDietaryRestrictions:input.diet,servings:2,ingredients:meal.ingredients,availableEquipment:['Stovetop'],pantryOnly:true,pantryPlanId:id,maximumMinutes:60,pantryInventory:input.pantryInventory})}));
  assert.equal(recipeResult.status,200,JSON.stringify(await recipeResult.clone().json()));assert.equal(simulatedUpstream,2);assert.equal(budget.read().attempts.filter(a=>a.kind==='planning').length,1);assert.equal(budget.read().attempts.filter(a=>a.kind==='recipe').length,1);
  // Redelivery cannot repeat a terminal plan. A different job is not allowed to
  // reuse this live run even if it has identical user-supplied fixture contents.
  await worker.processGenerationJob(id);assert.equal(simulatedUpstream,2);
  assert.throws(()=>budget.bindJob(randomUUID(),budget.read().inputHash),/SECOND_JOB_DENIED/);
  console.info('Bounded local SDK proof',{externalProviderCalls:0,simulatedUpstreamRequests:simulatedUpstream,inputBytes:budget.read().attempts.map(a=>({kind:a.kind,bytes:a.inputBytes})),outputCaps:{planning:4096,recipe:3500},socketTransport:process.env.MEALCADDIE_TEST_HTTP==='1'});
 });}finally{await new Promise(resolve=>server.close(resolve));await lab.close();assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true});}
});
