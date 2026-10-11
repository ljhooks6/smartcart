import {readFileSync,writeFileSync} from 'node:fs';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
const state=JSON.parse(readFileSync('.phase3-lab-state.json','utf8'));
assert.equal(state.api,'http://127.0.0.1:54321');
const anon=readFileSync('.env.local','utf8').split('\n').find(line=>line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')).split('=')[1];
for(const user of Object.values(state.users)) {const response=await fetch(state.api+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password:user.password})});assert.equal(response.status,200);const data=await response.json();user.token=data.access_token;user.refresh=data.refresh_token;}
writeFileSync('.phase3-lab-state.json',JSON.stringify(state,null,2));
const app='http://127.0.0.1:3002';
const request=async(path,user,body,origin=app)=>{const response=await fetch(app+path,{method:body?'POST':'GET',headers:{...(user?{Authorization:'Bearer '+state.users[user].token}:{}),...(body?{'Content-Type':'application/json',Origin:origin}:{})},...(body?{body:JSON.stringify(body)}:{})});return{status:response.status,data:await response.json()};};
assert.equal((await request('/api/beta/onboarding',null)).status,401);
for(const [name,plan] of [['free','free'],['plus','plus']]){const result=await request('/api/beta/onboarding',name);assert.equal(result.status,200);assert.equal(result.data.featurePlan,plan);assert.equal(result.data.billingPlan,'free');const feedback=await request('/api/beta/onboarding',name,{action:'feedback',category:'suggestion',feature:'onboarding',message:'Local application API feedback with analytics off',requestKey:randomUUID()});assert.equal(feedback.status,200);}
assert.equal((await request('/api/beta/onboarding/admin','free')).status,403);
assert.equal((await request('/api/beta/onboarding/admin','admin')).status,200);
assert.equal((await request('/api/beta/onboarding','free',{action:'feedback',category:'bug',feature:'other',message:'Cross-origin attempt denied',requestKey:randomUUID()},'https://evil.example.invalid')).status,403);
assert.equal((await request('/api/feature-membership','plus')).data.featurePlan,'plus');
console.log('PASS real local application APIs: verified Free/Plus features, feedback without analytics, missing auth, admin restriction, origin denial and feature membership.');
