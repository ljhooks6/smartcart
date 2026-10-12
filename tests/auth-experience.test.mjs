import test from 'node:test'; import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loader} from './helpers/load-local-ts.mjs';
const load=loader();const d=load('lib/auth-destination.ts'),p=load('lib/personalization.ts'),i=load('lib/auth-intent.ts');
const secret='disposable-auth-return-secret-at-least-32-characters';
test('only exact same-origin destinations survive malformed, encoded, external and unsafe callback input',()=>{
 for(const route of ['/','/beta/pilot-apply','/beta/accept','/beta/participant','/admin/beta','/admin/beta/onboarding'])assert.equal(d.authDestination(route),route);
 for(const route of ['https://evil.invalid','//evil.invalid','/\\evil.invalid','/beta/accept?token=secret','/beta/accept#invite=secret','/%2f%2fevil.invalid','/auth/sign-in','/account/setup','/beta/pilot-apply/../admin/beta','/beta/pilot-apply\n','javascript:alert(1)',null,{}])assert.equal(d.authDestination(route),'/');
 assert.equal(d.requestedDestination('?next=%2Fbeta%2Fpilot-apply'),'/beta/pilot-apply');assert.equal(d.requestedDestination('?next=%2Fbeta%2Faccept&next=%2Fadmin%2Fbeta'),'/');
});
test('encrypted return context survives email/OAuth root callbacks and refresh but rejects tampering, expiry and wrong secret',()=>{
 const token='A'.repeat(43);const sealed=i.sealIntent('/beta/accept',token,secret,1000);
 assert.equal(sealed.includes(token),false);assert.deepEqual(i.openIntent(sealed,secret,1001),{destination:'/beta/accept',invitation:token});
 assert.deepEqual(i.openIntent(sealed,secret,1002),{destination:'/beta/accept',invitation:token});
 for(const [value,key,now] of [[sealed,secret,1801001],[sealed,'another-disposable-secret-that-is-long',1001],[sealed.slice(0,-8)+'bad',secret,1001],[sealed,secret,999]])assert.equal(i.openIntent(value,key,now),null);
 const cookie=i.intentHeader(sealed,new Request('https://preview.mealcaddie.app/'));assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Lax/);assert.match(cookie,/Max-Age=1800/);
 assert.equal(i.openIntent(i.sealIntent('/beta/pilot-apply',token,secret),secret).invitation,undefined);
});
test('name validation preserves Unicode, chosen names and optional generic greetings',()=>{
 for(const name of ['LaDarius','Rachel','Renée O’Connor','李 小龙','Anne-Marie','Zoë 🥘'])assert.equal(p.preferredName(name),name);
 assert.equal(p.preferredName('  Renée   O’Connor  '),'Renée O’Connor');
 for(const name of ['x'.repeat(61),'<script>','Name\u202Ewrong',4,null])assert.equal(p.preferredName(name),'');
 assert.equal(p.welcomeGreeting('Rachel'),'Welcome back, Rachel!');assert.equal(p.welcomeGreeting('Rachel',true),'Welcome to MealCaddie, Rachel!');assert.equal(p.welcomeGreeting(''),'Welcome back!');
});
test('Google prefill never replaces a saved name or derives names from email; setup stays skippable for existing accounts',()=>{
 const google={app_metadata:{providers:['email','google']},user_metadata:{full_name:'Google Name'},created_at:new Date().toISOString()};
 assert.equal(p.personalProfile(google).prefill,'Google Name');assert.equal(p.personalProfile(google).newAccount,true);
 assert.equal(p.personalProfile({...google,user_metadata:{...google.user_metadata,preferred_name:'Chosen',mealcaddie_setup_complete:true}}).prefill,'Chosen');
 assert.equal(p.personalProfile({...google,created_at:'2025-01-01T00:00:00Z'}).newAccount,false);
 assert.equal(p.personalProfile({email:'rachel@example.invalid',user_metadata:{full_name:'Email supplied name'}}).prefill,'');
 assert.equal(p.personalProfile({...google,user_metadata:{full_name:'<bad>'}}).prefill,'');
});
test('first welcome survives profile refresh during the first view, but becomes returning on a new visit',()=>{
 const values=new Map([['mealcaddie-first-welcome:new-owner','yes']]);const storage={getItem:k=>values.get(k)??null,removeItem:k=>values.delete(k)};const mounted=new Map();
 assert.equal(p.firstWelcome(storage,'new-owner',mounted),true);assert.equal(p.firstWelcome(storage,'new-owner',mounted),true);
 assert.equal(p.firstWelcome(storage,'other-owner',mounted),false);assert.equal(p.firstWelcome(storage,'new-owner',new Map()),false);
});
test('profile endpoint verifies ownership and allows only name/skip, preserving all privilege metadata',async()=>{
 const user={id:'verified-owner',email_confirmed_at:'2026-01-01',created_at:'2025-01-01',user_metadata:{preferred_name:'Existing',full_name:'Google',other:'retained'},app_metadata:{provider:'google'}};
 let updates=[];const saved=globalThis.fetch;
 const api=loader({'@supabase/supabase-js':{createClient:()=>({auth:{getUser:async(token)=>({data:{user:token==='valid'?user:null},error:token==='valid'?null:{status:401}})}})},'beta-server':{betaJson:(body,status=200)=>Response.json(body,{status}),boundedJson:r=>r.json()}})('lib/personalization-server.ts');
 const request=(body,token='valid',origin='https://preview.example.invalid')=>new Request('https://preview.example.invalid/api/account/profile',{method:'PUT',headers:{Authorization:`Bearer ${token}`,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
 globalThis.fetch=async(url,init)=>{updates.push({url,init,body:JSON.parse(init.body)});return Response.json({...user,user_metadata:{...user.user_metadata,...JSON.parse(init.body).data}});};
 try{
  assert.equal((await api.profileGet(request({}))).status,200);
  for(const body of [{id:'victim',name:'Wrong'},{name:'Wrong',plan:'plus'},{name:'Wrong',app_metadata:{role:'admin'}},{name:'x'.repeat(61)},{skip:true,name:'Wrong'}])assert.equal((await api.profilePut(request(body))).status,400);
  assert.equal((await api.profilePut(request({name:'Good'},'invalid'))).status,401);assert.equal((await api.profilePut(request({name:'Good'},'valid','https://evil.invalid'))).status,403);assert.equal(updates.length,0);
  assert.equal((await api.profilePut(request({name:'Renée'}))).status,200);assert.deepEqual(updates[0].body,{data:{mealcaddie_setup_complete:true,preferred_name:'Renée'}});assert.equal(updates[0].init.headers.Authorization,'Bearer valid');
  assert.equal((await api.profilePut(request({skip:true}))).status,200);assert.deepEqual(updates[1].body,{data:{mealcaddie_setup_complete:true}});
 }finally{globalThis.fetch=saved;}
});
test('intent HTTP flow preserves token only in encrypted cookie, verifies sessions, and clears after arrival',async()=>{
 const before=process.env.BETA_RATE_LIMIT_SECRET;process.env.BETA_RATE_LIMIT_SECRET=secret;
 const api=loader({'personalization-server':{personAccess:async r=>r.headers.get('authorization')==='Bearer verified'?{user:{id:'owner'}}:{response:Response.json({error:'Unauthorized'},{status:401})}},'beta-server':{betaJson:(body,status=200)=>Response.json(body,{status}),boundedJson:r=>r.json(),requireBetaAdmin:async()=>({response:Response.json({error:'Admin required'},{status:403})})},'beta-onboarding-domain':{onboardingEnabled:()=>true},'beta-pilot':{pilotIdentityAllowed:()=>false}})('app/api/auth/intent/route.ts');
 const req=(method,body,cookie,verified=true,origin='https://preview.example.invalid')=>new Request('https://preview.example.invalid/api/auth/intent',{method,headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(verified?{Authorization:'Bearer verified'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 try{
  assert.equal((await api.POST(req('POST',{destination:'//evil.invalid'}))).status,400);
  assert.equal((await api.POST(req('POST',{destination:'/'},null,true,'https://evil.invalid'))).status,403);
  let result=await api.POST(req('POST',{destination:'/beta/accept',invitation:'B'.repeat(43)}));assert.equal(result.status,200);let cookie=result.headers.get('set-cookie').split(';')[0];
  result=await api.POST(req('POST',{destination:'/beta/accept',preserveInvitation:true},cookie));cookie=result.headers.get('set-cookie').split(';')[0];
  assert.equal((await api.GET(req('GET',null,cookie,false))).status,401);
  result=await api.GET(req('GET',null,cookie));assert.deepEqual(await result.json(),{destination:'/beta/accept',invitation:'B'.repeat(43)});assert.equal(result.headers.get('set-cookie'),null);
  assert.match((await api.DELETE(req('DELETE',{},cookie))).headers.get('set-cookie'),/Max-Age=0/); for(const destination of ['/admin/beta','/beta/pilot-apply']) { const blocked=await api.POST(req('POST',{destination})); const blockedCookie=blocked.headers.get('set-cookie').split(';')[0]; assert.deepEqual(await (await api.GET(req('GET',null,blockedCookie))).json(),{destination:'/',unavailable:true}); }
 }finally{if(before===undefined)delete process.env.BETA_RATE_LIMIT_SECRET;else process.env.BETA_RATE_LIMIT_SECRET=before;}
});


