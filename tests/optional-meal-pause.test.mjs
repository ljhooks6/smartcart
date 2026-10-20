import test from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './helpers/load-ts.mjs';
const input={budget:50,diet:'No preference',householdSize:2,combinedPantryItems:'Rice'};
const request=body=>new Request('http://local.test/api/generate-list',{method:'POST',body:JSON.stringify(body)});
const authorize={'@/lib/product-access':{requireProductAccess:async()=>null},'@/lib/legal-agreements':{requireAgreements:async()=>null}};

test('new job requests pause breakfast/lunch before identity lookup, quota reservation or dispatch for all tiers',async()=>{
 let operations=0;
 const route=loader({...authorize,'@/lib/generation-identity':{generationIdentity:async()=>{operations++;throw Error('not reached');}},'@/lib/generation-jobs':{reserveGenerationJob:async()=>{operations++;throw Error('not reached');},publicGenerationJob:j=>j,readGenerationJob:async()=>null},'@/lib/generation-dispatch':{dispatchGenerationJob:async()=>{operations++;}}})('app/api/generate-list/route.ts');
 for(const tier of ['guest','free','plus','administrator'])for(const option of ['includeBreakfast','includeLunch']){
  const r=await route.POST(request({...input,[option]:true,plan:tier}));assert.equal(r.status,422);assert.equal((await r.json()).code,'MEAL_TYPE_PAUSED');
 }
 assert.equal(operations,0);
});

test('direct replacements, legacy endpoint and queued engine cannot generate new optional meals',async()=>{
 process.env.OPENAI_API_KEY='mock-only';let providerCalls=0;
 class Provider{chat={completions:{create:async()=>{providerCalls++;throw Error('not reached');}}};}
 const overrides={...authorize,openai:Provider,'@/lib/server-membership':{getRequestMembership:async()=>({plan:'plus'})},'@/lib/beta-pilot-ai':{pilotAIBudget:async()=>{throw Error('not reached');}},'./beta-pilot-ai':{pilotAIBudget:async()=>{throw Error('not reached');}}};
 const replacement=loader(overrides)('app/api/replace-meal/route.ts');
 for(const type of ['breakfast','lunch'])assert.equal((await replacement.POST(request({...input,mealType:type,rejectedMealTitle:'Saved toast'}))).status,422);
 const legacy=loader(overrides)('app/api/meal-plan/route.ts');assert.equal((await legacy.POST(request({...input,includeLunch:true}))).status,422);
 const engine=loader(overrides)('lib/meal-generation.ts');
 for(const plan of ['free','plus'])assert.equal((await engine.generateMealPlan({...input,includeBreakfast:true},plan)).status,422);
 assert.equal(providerCalls,0);
});

test('completed historical breakfast plans remain readable and owner-scoped',async()=>{
 const calls=[],job={id:'11111111-1111-4111-8111-111111111111',status:'completed',input:{...input,includeBreakfast:true},result:{meals:[{name:'Saved toast',day:'Breakfast 1'}]}};
 const route=loader({...authorize,'@/lib/generation-identity':{generationIdentity:async()=>({owner:'synthetic-owner',plan:'free'})},'@/lib/generation-jobs':{readGenerationJob:async(owner)=>{calls.push(owner);return job;},publicGenerationJob:j=>j},'@/lib/generation-dispatch':{dispatchGenerationJob:async()=>{throw Error('must not dispatch');}}})('app/api/generate-list/route.ts');
 const r=await route.GET(new Request('http://local.test/api/generate-list?id='+job.id));assert.equal(r.status,200);assert.equal((await r.json()).job.result.meals[0].name,'Saved toast');assert.deepEqual(calls,['synthetic-owner']);
});
