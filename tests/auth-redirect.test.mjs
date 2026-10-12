import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {emailAuthRedirect,signInMealCaddieEmail,signInMealCaddieGoogle} from '../lib/auth-redirect.ts';
test('email auth stays on the exact approved production, preview and local roots',()=>{
  for(const origin of ['https://mealcaddie.app','https://preview.mealcaddie.app','https://smartcart-git-feature-beta-recruitment-ljhooks6s-projects.vercel.app','https://mealcaddie.vercel.app','https://smartcart-lovat.vercel.app','http://localhost:3000','http://localhost:3001']) assert.equal(emailAuthRedirect(origin),origin+'/');
});
test('email auth rejects unapproved hosts, schemes, userinfo and injected return URLs before sending',async()=>{
  let calls=0;const auth={signInWithOtp:async()=>{calls++;return {error:null};}};
  for(const origin of ['https://evil.invalid','https://preview.mealcaddie.app.evil.invalid','http://preview.mealcaddie.app','https://mealcaddie.app@evil.invalid','https://evil@mealcaddie.app','https://mealcaddie.app/?returnTo=https://evil.invalid','https://mealcaddie.app/#callback','https://mealcaddie.app/other','http://localhost:9999'])assert.throws(()=>signInMealCaddieEmail(auth,'owner@example.invalid',origin));
  assert.equal(calls,0);
});
test('real Supabase SDK OTP request carries the environment redirect and preserves open signup',async()=>{
  for(const origin of ['https://preview.mealcaddie.app','https://mealcaddie.app']){
    const requests=[];
    const client=createClient('https://project.example.invalid','public-key-fixture',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(url,init)=>{requests.push({url:String(url),body:JSON.parse(init.body)});return Response.json({});}}});
    const result=await signInMealCaddieEmail(client.auth,'owner@example.invalid',origin);
    assert.equal(result.error,null);assert.equal(requests.length,1);
    const request=requests[0];assert.equal(new URL(request.url).searchParams.get('redirect_to'),origin+'/');
    assert.equal(request.body.email,'owner@example.invalid');assert.equal(request.body.create_user,true);
  }
});
test('real Google SDK authorizes only exact approved root callbacks and keeps existing account chooser options',async()=>{
 for(const origin of ['https://preview.mealcaddie.app','https://mealcaddie.app']){
  const client=createClient('https://project.example.invalid','public-key-fixture',{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const result=await signInMealCaddieGoogle(client.auth,origin);assert.equal(result.error,null);
  const url=new URL(result.data.url);assert.equal(url.searchParams.get('provider'),'google');assert.equal(url.searchParams.get('redirect_to'),origin+'/');assert.equal(url.searchParams.get('prompt'),'consent select_account');
 }
 assert.throws(()=>signInMealCaddieGoogle({signInWithOAuth:()=>{throw Error('must not execute')}},'https://evil.invalid'));
});
