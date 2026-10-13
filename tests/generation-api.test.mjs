import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');const require=createRequire(import.meta.url);
function loader(mocks) {
  const cache=new Map();
  function load(file) {
    if(cache.has(file))return cache.get(file);
    const module={exports:{}};
    const source=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    function resolve(name) {
      for(const [key,value] of Object.entries(mocks))if(name===key||name.endsWith('/'+key))return value;
      if(name==='next/server')return {NextResponse:{json:(body,init)=>Response.json(body,init)}};
      if(name.startsWith('@/')||name.startsWith('.'))return load((name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(file),name))+'.ts');
      return require(name);
    }
    new Function('require','module','exports',source)(resolve,module,module.exports);cache.set(file,module.exports);return module.exports;
  }
  return load;
}
const input={budget:100,diet:'Vegetarian',householdSize:2,combinedPantryItems:'rice',generationQuality:'plus',userId:'forged'};
const request=(body=input,headers={})=>new Request('http://local.test/api/generate-list',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':randomUUID(),...headers},body:JSON.stringify(body)});

test('job API verifies identity; body flags cannot upgrade, quota comes from server, data is private',async()=>{
  process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
  const reservations=[],published=[];
  const admin={auth:{getUser:async token=>({data:{user:token==='invalid'?null:{id:'real-owner'}},error:token==='invalid'?{status:401}:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{plan:'free'},error:null})})})})};
  const job={id:randomUUID(),status:'queued',input,owner_key:'real-owner',quota_key:'private',created_at:'now',updated_at:'now',result:null,error:null};
  const load=loader({'supabase-admin':{getSupabaseAdminClient:()=>admin},'generation-jobs':{
    reserveGenerationJob:async(identity,key,body)=>{reservations.push({identity,key,body});return {job,reused:false};},
    publicGenerationJob:j=>({id:j.id,status:j.status}),readGenerationJob:async()=>null,
  },'generation-dispatch':{dispatchGenerationJob:async id=>published.push(id)}});
  const {POST,GET}=load(path.join(root,'app/api/generate-list/route.ts'));
  const response=await POST(request(input,{Authorization:'Bearer valid'}));
  assert.equal(response.status,202);assert.equal(reservations[0].identity.userId,'real-owner');assert.equal(reservations[0].identity.plan,'free');
  assert.equal('generationQuality' in reservations[0].body,false);assert.equal('userId' in reservations[0].body,false);
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.deepEqual(published,[job.id]);
  assert.equal((await POST(request(input,{Authorization:'Bearer invalid'}))).status,401);assert.equal(reservations.length,1);
  assert.equal((await GET(new Request(`http://local.test/api/generate-list?id=${job.id}`,{headers:{Authorization:'Bearer valid'}}))).status,404);
  assert.equal((await POST(request(input,{Origin:'https://other.test'}))).status,403);
});

test('saved reservation survives publish failure; quota and malformed input never dispatch',async()=>{
  const job={id:randomUUID(),status:'queued',input};let published=0;let code;
  const load=loader({'generation-identity':{generationIdentity:async()=>({owner:'user:one',quota:'user:one',userId:'one',plan:'plus',cookie:null})},'generation-jobs':{
    reserveGenerationJob:async()=>code?{code,limit:20,resetAt:new Date(Date.now()+3600000).toISOString()}:{job},publicGenerationJob:j=>j,
  },'generation-dispatch':{dispatchGenerationJob:async()=>{published++;throw Error('unavailable');}}});
  const {POST}=load(path.join(root,'app/api/generate-list/route.ts'));
  const failed=await POST(request());assert.equal(failed.status,503);assert.equal((await failed.json()).job.id,job.id);
  code='limit';const capped=await POST(request());assert.equal(capped.status,429);assert.ok(capped.headers.get('retry-after'));assert.match((await capped.json()).error,/20/);
  assert.equal((await POST(request({...input,budget:-1}))).status,400);assert.equal(published,1);
});

test('guest quota uses trusted network header, not guest cookie or spoofed IP fields',async()=>{
  const previous=process.env.VERCEL;process.env.VERCEL='1';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
  try {
    const {generationIdentity}=loader({'server-membership':{getRequestMembership:async()=>({plan:'free',userId:null})}})(path.join(root,'lib/generation-identity.ts'));
    const one=await generationIdentity(new Request('https://mealcaddie.app',{headers:{'x-vercel-forwarded-for':'192.0.2.1',cookie:`mealcaddie_guest=${randomUUID()}`}}));
    const two=await generationIdentity(new Request('https://mealcaddie.app',{headers:{'x-vercel-forwarded-for':'192.0.2.1',cookie:`mealcaddie_guest=${randomUUID()}`}}));
    assert.equal(one.quota,two.quota);assert.notEqual(one.owner,two.owner);assert.match(one.cookie,/HttpOnly/);assert.match(one.cookie,/Secure/);
    assert.equal((await generationIdentity(new Request('https://mealcaddie.app',{headers:{'x-forwarded-for':'192.0.2.1'}}))).status,503);
  }finally{if(previous===undefined)delete process.env.VERCEL;else process.env.VERCEL=previous;}
});

test('worker reads fresh membership and duplicate deliveries do not produce duplicate AI calls',async()=>{
  // Duplicate dispatch remains covered for an authorized Free request. Expired
  // Plus requests are separately tested to stop rather than silently downgrade.
  const job={id:randomUUID(),user_id:'owner',plan:'free',attempts:1,status:'queued',input};let calls=0;let state='queued';const finished=[];
  const load=loader({'generation-jobs':{
    claimGenerationJob:async()=>{if(state==='running')return {code:'busy'};if(state==='completed')return {code:'done'};state='running';return {job};},
    finishGenerationJob:async(j,status,result,error,usage)=>{state=status;finished.push({status,result,error,usage});},
  },'supabase-admin':{getSupabaseAdminClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{plan:'free'},error:null})})})})})},
  'meal-generation':{generateMealPlan:async(body,plan,onUsage)=>{calls++;assert.equal(plan,'free');await new Promise(r=>setTimeout(r,20));onUsage({durationMs:20});return Response.json({meals:[],desserts:[]});}}});
  const {processGenerationJob}=load(path.join(root,'lib/generation-worker.ts'));
  const results=await Promise.allSettled([processGenerationJob(job.id),processGenerationJob(job.id)]);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);assert.equal(calls,1);assert.equal(finished[0].status,'completed');
  await processGenerationJob(job.id);assert.equal(calls,1);
});

test('busy retries honor provider delays; uncertain or partially billed failures are not replayed',async()=>{
  for(const paid of [false,true]){
    const job={id:randomUUID(),user_id:null,attempts:1,input};const finished=[];
    const load=loader({'generation-jobs':{claimGenerationJob:async()=>({job}),finishGenerationJob:async(j,status)=>finished.push(status)},
      'meal-generation':{generateMealPlan:async(body,plan,onUsage)=>{if(paid)onUsage({});return Response.json({error:'busy',retryable:true},{status:503,headers:{'Retry-After':'120'}});}}});
    const {processGenerationJob}=load(path.join(root,'lib/generation-worker.ts'));
    if(paid){await processGenerationJob(job.id);assert.deepEqual(finished,['failed']);}
    else{await assert.rejects(processGenerationJob(job.id),e=>e.afterSeconds===120);assert.deepEqual(finished,['queued']);}
  }
});
