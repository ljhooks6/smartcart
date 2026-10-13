import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loader } from './helpers/load-ts.mjs';
import { fixture, plus, paid, activated, server, root } from './helpers/beta-onboarding-fixture.mjs';

test('server reservations use revised tier limits and unchanged guest duration', async () => {
  const calls=[];
  const load=loader({'./supabase-admin':{getSupabaseAdminClient:()=>({rpc:async(name,args)=>{calls.push(args);return {data:{},error:null};}})}});
  const {generationLimits}=load('lib/generation-request.ts');
  const {reserveGenerationJob}=load('lib/generation-jobs.ts');
  for(const [plan,limit,seconds] of [['free',5,604800],['plus',20,604800],['guest',3,86400]]) {
    assert.deepEqual(generationLimits(plan),{limit,seconds});
    await reserveGenerationJob({owner:'test',quota:'test',userId:null,plan},randomUUID(),{budget:100});
    assert.equal(calls.at(-1).p_limit,limit);assert.equal(calls.at(-1).p_seconds,seconds);
  }
});

test('temporary Plus receives twenty plans; expiration and revocation restore five without changing stored plan',async()=>{
 const db=await fixture();try {
   const limits=loader()('lib/generation-request.ts').generationLimits;
   await activated(db,plus,'plus');
   const plan=async()=>{await server(db);return (await db.query('select beta_effective_plan($1) plan',[plus])).rows[0].plan;};
   assert.equal(limits(await plan()).limit,20);
   await root(db);assert.equal((await db.query('select plan from smartcart_profiles where id=$1',[plus])).rows[0].plan,'free');
   await db.exec("update beta_participations set activated_at=now()-interval '31 days',expires_at=now()-interval '1 second'");assert.equal(limits(await plan()).limit,5);
   await root(db);await db.exec("update beta_participations set expires_at=now()+interval '1 day',revoked_at=now()");assert.equal(limits(await plan()).limit,5);
   assert.equal((await db.query('select beta_effective_plan($1) plan',[paid])).rows[0].plan,'plus');
 }finally{await db.close();}
});
