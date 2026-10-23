import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {loader} from './helpers/load-ts.mjs';

function render(file, props, {failure=false, seeds=[]}={}) {
 const buttons=[],calls=[];let cursor=0;
 const hooks={...React,useState:initial=>[cursor<seeds.length?seeds[cursor++]:initial,()=>{}],useEffect:()=>{},useRef:value=>({current:value}),useCallback:fn=>fn};
 const runtime={...jsx};for(const name of ['jsx','jsxs'])runtime[name]=(type,p,...rest)=>{if(type==='button')buttons.push(p);return jsx[name](type,p,...rest);};
 const mod={exports:{}};
 new Function('require','module','exports',ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText)(name=>{
  if(name==='react')return hooks;if(name==='react/jsx-runtime')return runtime;
  if(name==='next/link')return {__esModule:true,default:({href,...p})=>React.createElement('a',{href,...p})};
  if(name==='next/navigation')return {useRouter:()=>({}),usePathname:()=>'/'};
  if(name.includes('mealcaddie-logo'))return {MealCaddieLogo:()=>React.createElement('span',null,'MealCaddie')};
  if(name.includes('account-personalization'))return {usePersonalization:()=>({profile:null})};
  if(name.includes('account-client'))return {rememberDestination:async(...args)=>{calls.push(args);}};
  if(name.includes('auth-destination'))return {signInPath:next=>'/auth/sign-in?next='+encodeURIComponent(next)};
  if(name.includes('auth-redirect'))return {};
  if(name.includes('supabase'))return {initialAuthFailure:failure,supabase:{}};
  throw Error(name);
 },mod,mod.exports);
 const Component=file.includes('beta-participant')?mod.exports.BetaParticipant:mod.exports.CredentialAccess;
 return {html:renderToStaticMarkup(React.createElement(Component,props)),buttons,calls};
}
test('real registration and returning-login screens distinguish password-first enrollment without leaking account data',()=>{
 const registration=render('components/credential-access.tsx',{mode:'register',enabled:true});
 for(const text of ['username, email and password','Google and email-link registration are not available','do not create a replacement account','explicit invitation acceptance'])assert.ok(registration.html.includes(text),text);
 assert.equal(registration.buttons.some(b=>b.children==='Continue with Google'),false);
 const login=render('components/credential-access.tsx',{mode:'login',enabled:true},{failure:true});
 assert.match(login.html,/Google and email links sign in to established accounts only/);
 assert.match(login.html,/Sign-in could not finish/);assert.match(login.html,/role="alert"/);
 assert.ok(login.buttons.some(b=>b.children==='Continue with Google'));
 assert.ok(login.buttons.some(b=>b.children==='Email me a sign-in link instead'));
});
test('signed-out invitation preserves return context before either registration or existing-account sign-in',async()=>{
 const previous=global.window;const paths=[];global.window={location:{assign:path=>paths.push(path)}};
 try {
  const result=render('components/beta-participant.tsx',{accept:true,enabled:true},{seeds:[null,null,false,false,false,false,false,false,'','','bug','other','',false]});
  assert.match(result.html,/New invited tester/);assert.match(result.html,/registration alone does not activate access/);
  result.buttons.find(b=>b.children==='Create my invited account').onClick();await Promise.resolve();
  assert.equal(paths.pop(),'/auth/register?next=%2Fbeta%2Faccept');assert.deepEqual(result.calls.pop(),['/beta/accept',undefined]);
  result.buttons.find(b=>b.children==='Sign in to MealCaddie').onClick();await Promise.resolve();
  assert.equal(paths.pop(),'/auth/sign-in?next=%2Fbeta%2Faccept');assert.deepEqual(result.calls.pop(),['/beta/accept',undefined]);
 }finally{if(previous===undefined)delete global.window;else global.window=previous;}
});
test('callback failure captures only a boolean before SDK cleanup, never private provider details',()=>{
 const previous=global.window;try{
  global.window={location:{search:'?error_code=signup_disabled&error_description=private%40example.invalid',hash:''}};
  const api=loader({'@supabase/supabase-js':{createClient:()=>{global.window.location.search='';return {};}}})('lib/supabase.ts');
  assert.equal(api.initialAuthFailure,true);assert.equal(typeof api.initialAuthFailure,'boolean');
  assert.equal(global.window.location.search,'');
 }finally{if(previous===undefined)delete global.window;else global.window=previous;}
});
