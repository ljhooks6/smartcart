import test from 'node:test';
import assert from 'node:assert/strict';
import {loader,withEnv} from './helpers/load-ts.mjs';
function fixture(event,{invalid=false,writeFailure=false}={}) {
  const calls=[];
  const actualBilling=loader({'@/lib/supabase-admin':{getSupabaseAdminClient:()=>{throw Error('not used');}}})('lib/smart-cart-billing.ts');
  const load=loader({
    '@/lib/stripe':{getStripeServerClient:()=>({webhooks:{constructEvent:(body,signature,secret)=>{
      assert.equal(body,'fixture');assert.equal(signature,'fixture-signature');assert.equal(secret,'fixture-secret');
      if(invalid)throw Error('invalid signature');return event;
    }}})},
    '@/lib/smart-cart-billing':{
      isStripeSubscriptionActive:actualBilling.isStripeSubscriptionActive,
      upsertSmartCartSubscription:async args=>{calls.push(['subscription',args]);if(writeFailure)throw Error('write failure');},
      setSmartCartPlanForUser:async(...args)=>calls.push(['plan',...args]),
    },
  });
  return {POST:load('app/api/stripe/webhook/route.ts').POST,calls};
}
const req=(signature=true)=>new Request('https://example.invalid/api/stripe/webhook',{method:'POST',headers:signature?{'stripe-signature':'fixture-signature'}:{},body:'fixture'});
test('Stripe rejects unsigned or invalid webhook before any account write',async()=>withEnv({STRIPE_WEBHOOK_SECRET:'fixture-secret'},async()=>{
  for(const [signature,invalid] of [[false,false],[true,true]]){const f=fixture({}, {invalid});assert.equal((await f.POST(req(signature))).status,400);assert.deepEqual(f.calls,[]);}
}));
test('Stripe active, trialing and past_due retain Plus; canceled and incomplete retain Free',async()=>withEnv({STRIPE_WEBHOOK_SECRET:'fixture-secret'},async()=>{
  for(const status of ['active','trialing','past_due','canceled','incomplete']) {
    const f=fixture({type:'customer.subscription.updated',data:{object:{id:'sub_fixture',status,customer:'cus_fixture',metadata:{supabase_user_id:'existing-user'},items:{data:[]},current_period_end:1800000000}}});
    assert.equal((await f.POST(req())).status,200);
    const plan=['active','trialing','past_due'].includes(status)?'plus':'free';
    assert.deepEqual(f.calls,[['subscription',{currentPeriodEnd:1800000000,plan,providerCustomerId:'cus_fixture',providerSubscriptionId:'sub_fixture',status,userId:'existing-user'}],['plan','existing-user',plan]]);
  }
}));
test('Stripe missing user metadata does not assign a plan',async()=>withEnv({STRIPE_WEBHOOK_SECRET:'fixture-secret'},async()=>{
  const f=fixture({type:'customer.subscription.updated',data:{object:{id:'sub_fixture',status:'active',customer:'cus_fixture',metadata:{},items:{data:[]}}}});
  assert.equal((await f.POST(req())).status,200);assert.deepEqual(f.calls,[]);
}));
test('Stripe database failure returns retryable failure and does not continue plan write',async()=>withEnv({STRIPE_WEBHOOK_SECRET:'fixture-secret'},async()=>{
  const f=fixture({type:'customer.subscription.updated',data:{object:{id:'sub_fixture',status:'active',metadata:{supabase_user_id:'existing-user'},items:{data:[]}}}},{writeFailure:true});
  assert.equal((await f.POST(req())).status,500);assert.equal(f.calls.length,1);
}));
