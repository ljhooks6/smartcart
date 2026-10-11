import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {loader} from './helpers/load-local-ts.mjs';import {fixture,server} from './helpers/beta-onboarding-fixture.mjs';
const config={BETA_PILOT_MODE:'true',BETA_PILOT_AI_LIMIT_ENABLED:'true',VERCEL:'1',VERCEL_ENV:'preview',BETA_RATE_LIMIT_SECRET:'disposable-only-secret-'.repeat(3)};
async function withEnv(values,run){const old=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));Object.assign(process.env,values);try{return await run();}finally{for(const k of Object.keys(values))if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
test('preview pilot AI budget is global, atomic and capped; Production and disabled environments remain untouched',async()=>withEnv(config,async()=>{
 const db=await fixture();let calls=0;
 try{await server(db);const api=loader({'supabase-admin':{getSupabaseAdminClient:()=>({rpc:async(name,args)=>{calls++;return{data:(await db.query('select beta_check_rate($1) allowed',[args.p_key])).rows[0].allowed,error:null};}})}})('lib/beta-pilot-ai.ts');
 const responses=await Promise.all(Array.from({length:8},()=>api.pilotAIBudget({synthetic:true})));assert.equal(responses.filter(r=>r===null).length,5);assert.equal(responses.filter(r=>r?.status===429).length,3);
 assert.equal((await db.query('select count(distinct network_key)::int n from beta_rate_limits')).rows[0].n,1);
 const before=calls;await withEnv({VERCEL_ENV:'production'},async()=>assert.equal(await api.pilotAIBudget({}),null));await withEnv({BETA_PILOT_AI_LIMIT_ENABLED:'false'},async()=>assert.equal(await api.pilotAIBudget({}),null));assert.equal(calls,before);
 assert.equal((await api.pilotAIBudget({content:'A'.repeat(32001)})).status,413);assert.equal(calls,before);
 }finally{await db.close();}
}));
test('pilot AI rate-limit failures fail closed before a provider request',async()=>withEnv(config,async()=>{
 for(const result of [{data:null,error:{message:'unavailable'}},{data:null,error:null}]){const api=loader({'supabase-admin':{getSupabaseAdminClient:()=>({rpc:async()=>result})}})('lib/beta-pilot-ai.ts');assert.equal((await api.pilotAIBudget({})).status,503);}
}));
test('all provider-starting features include the pilot gate, while token and transport bounds remain present',()=>{
 for(const file of ['lib/meal-generation.ts','app/api/get-recipe/route.ts','app/api/replace-meal/route.ts','app/api/replace-dessert/route.ts','app/api/consolidate-ingredients/route.ts'])assert.match(readFileSync(file,'utf8'),/await pilotAIBudget\(body\)/);
 assert.match(readFileSync('app/api/consolidate-ingredients/route.ts','utf8'),/max_completion_tokens: 2000/);
});
