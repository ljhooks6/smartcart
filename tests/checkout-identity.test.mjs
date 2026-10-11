import test from 'node:test';
import assert from 'node:assert/strict';
import { loader, withEnv } from './helpers/load-ts.mjs';
function fixture({ plan='free', invalid=false, outage=false, profileOutage=false, unconfirmed=false, customer=null } = {}) {
  const calls=[]; const lookups=[];
  const user={ id:'verified-owner', email:'verified@example.invalid', email_confirmed_at:unconfirmed ? null : '2026-10-10' };
  const admin = {
    auth: { getUser: async token => {
      assert.equal(token, 'valid'); if (outage) throw Error('outage');
      return { data: { user: invalid ? null : user }, error: invalid ? { status: 401 } : null };
    } },
    from: table => {
      assert.equal(table, 'smartcart_profiles');
      return { select: columns => {
        assert.equal(columns, 'plan');
        return { eq: (column, id) => {
          assert.equal(id, user.id);
          return { maybeSingle: async () => ({ data: { plan }, error: profileOutage ? {} : null }) };
        } };
      } };
    },
  };
  const load=loader({ '@/lib/supabase-admin':{getSupabaseAdminClient:()=>admin}, '@/lib/smart-cart-billing':{fetchLatestSubscriptionForUser:async id=>{lookups.push(id);return customer?{provider_customer_id:customer}:null;}}, '@/lib/stripe':{getStripeMonthlyPriceId:()=> 'price_unchanged',getStripeServerClient:()=>({checkout:{sessions:{create:async input=>{calls.push(input);return {url:'https://checkout.stripe.test/session'};}}}})} });
  return { POST:load('app/api/create-checkout-session/route.ts').POST,calls,lookups };
}
const request=(token,body={userId:'victim',email:'attacker@example.invalid',plan:'plus'})=>new Request('https://mealcaddie.app/api/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
test('checkout rejects missing identity before Stripe or subscription lookup',async()=>{const f=fixture();assert.equal((await f.POST(request())).status,401);assert.equal(f.calls.length,0);assert.equal(f.lookups.length,0);});
test('invalid identity, unverified email and outages never create checkout',async()=>{for(const [options,status] of [[{invalid:true},401],[{unconfirmed:true},401],[{outage:true},503],[{profileOutage:true},503]]){const f=fixture(options);assert.equal((await f.POST(request('valid'))).status,status);assert.equal(f.calls.length,0);assert.equal(f.lookups.length,0);}});
test('verified profile Plus blocks checkout regardless of submitted Free value',async()=>{const f=fixture({plan:'plus'});assert.equal((await f.POST(request('valid',{plan:'free'}))).status,400);assert.equal(f.calls.length,0);});
test('spoofed fields cannot choose account or block verified Free checkout; settings unchanged',async()=>withEnv({NEXT_PUBLIC_APP_URL:'https://mealcaddie.app'},async()=>{const f=fixture();assert.equal((await f.POST(request('valid'))).status,200);assert.deepEqual(f.lookups,['verified-owner']);const input=f.calls[0];assert.equal(input.metadata.supabase_user_id,'verified-owner');assert.equal(input.subscription_data.metadata.supabase_user_id,'verified-owner');assert.equal(input.customer_email,'verified@example.invalid');assert.equal(input.mode,'subscription');assert.equal(input.allow_promotion_codes,true);assert.deepEqual(input.line_items,[{price:'price_unchanged',quantity:1}]);assert.equal(input.cancel_url,'https://mealcaddie.app/?billing=cancelled');assert.equal(input.success_url,'https://mealcaddie.app/?billing=success');}));
test('existing Stripe customer is reused for the verified owner',async()=>{const f=fixture({customer:'cus_existing'});assert.equal((await f.POST(request('valid'))).status,200);assert.equal(f.calls[0].customer,'cus_existing');assert.equal(f.calls[0].customer_email,undefined);});
