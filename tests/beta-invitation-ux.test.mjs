import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {loader} from './helpers/load-local-ts.mjs';

function reviewFixture({user='owner',state='issued',expired=false,error=false,missing=false,verified=true}={}) {
 const reads=[]; let mutations=0;
 const client={auth:{getUser:async()=>({data:{user:{id:user,email:user+'@example.invalid',email_confirmed_at:verified?'verified':null}},error:null})},
 from:name=>({select:fields=>({eq:(field,hash)=>({maybeSingle:async()=>{reads.push({name,fields,field,hash});return {data:missing?null:{id:'invitation-id',state,bound_user_id:'owner',expires_at:new Date(Date.now()+(expired?-1000:86400000)).toISOString(),beta_applications:{email:'owner@example.invalid',cohort:'plus',status:'invited'}},error:error?{message:'private database detail'}:null};}})})}),
 rpc:()=>{mutations++;throw Error('Review must not mutate');}};
 return {api:loader({'beta-server':{betaStorageClient:()=>client,betaJson:(body,status=200)=>Response.json(body,{status}),boundedJson:r=>r.json()}})('lib/beta-onboarding-server.ts'),reads,get mutations(){return mutations;}};
}
const request=(body={token:'A'.repeat(43)},signedIn=true)=>new Request('https://preview.example.invalid/api/beta/onboarding/invitation',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://preview.example.invalid',...(signedIn?{Authorization:'Bearer synthetic'}:{})},body:JSON.stringify(body)});
async function configured(run){const keys=['BETA_ONBOARDING_ENABLED','VERCEL_ENV','BETA_PILOT_MODE'];const old=Object.fromEntries(keys.map(k=>[k,process.env[k]]));Object.assign(process.env,{BETA_ONBOARDING_ENABLED:'true',VERCEL_ENV:'preview',BETA_PILOT_MODE:'false'});try{await run();}finally{for(const k of keys)if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}}
test('review denies signed-out, unverified and spoofed inputs before token lookup',()=>configured(async()=>{
 for(const [options,body,signin,status] of [[{},undefined,false,401],[{verified:false},undefined,true,401],[{},{token:'bad'},true,400],[{},{token:'A'.repeat(43),userId:'owner'},true,400]]){const f=reviewFixture(options);assert.equal((await f.api.invitationReview(request(body,signin))).status,status);assert.equal(f.reads.length,0);assert.equal(f.mutations,0);}
}));
test('matching verified review returns safe cohort; wrong account reveals no private invitation data',()=>configured(async()=>{
 for(const user of ['owner','stranger']){const f=reviewFixture({user});const response=await f.api.invitationReview(request());const data=await response.json();assert.equal(data.state,user==='owner'?'ready':'wrong_account');assert.equal(data.cohort,user==='owner'?'plus':undefined);assert.equal(JSON.stringify(data).includes('owner@example.invalid'),false);assert.equal(JSON.stringify(data).includes('invitation-id'),false);assert.equal(f.reads[0].hash,createHash('sha256').update('A'.repeat(43)).digest('hex'));assert.equal(f.mutations,0);}
}));
test('read-only review distinguishes accepted, expired, revoked, missing and outage without modifying original links',()=>configured(async()=>{
 for(const [options,state,status] of [[{state:'consumed'},'accepted',200],[{expired:true},'expired',200],[{state:'revoked'},'revoked',200],[{missing:true},'unavailable',200],[{error:true},undefined,503]]){const f=reviewFixture(options);const response=await f.api.invitationReview(request());const body=await response.json();assert.equal(response.status,status);assert.equal(body.state,state);assert.equal(JSON.stringify(body).includes('private database'),false);assert.equal(f.mutations,0);}
}));

// Render the real JSX with seeded asynchronous state, without an auth session,
// browser storage, customer data or a database. Effects do not run in SSR.
function render({participation=null,accept=true,review=null,signedIn=true,recovery=false}={}) {
 const overview=signedIn?{verifiedEmail:'synthetic@example.invalid',participation,featurePlan:participation?.cohort==='plus'?'plus':'free',billingPlan:'free',feedback:[]}:null;
 const seeds=[overview,review,signedIn,false,recovery,false,false,!!review,'','','bug','other','',false];
 let cursor=0; const hooks={...React,useState:initial=>[cursor<seeds.length?seeds[cursor++]:initial,()=>{}],useRef:initial=>({current:initial}),useEffect:()=>{},useCallback:fn=>fn};
 const source=ts.transpileModule(readFileSync('components/beta-participant.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',source)(name=>{
 if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsxRuntime;
 if(name==='next/link')return {default:({href,...props})=>React.createElement('a',{href,...props}),__esModule:true};
 if(name.includes('mealcaddie-logo'))return {MealCaddieLogo:()=>React.createElement('span',null,'MealCaddie')};
 if(name.includes('auth-destination'))return {signInPath:next=>'/auth/sign-in?next='+encodeURIComponent(next)};
 if(name.includes('account-client'))return {};
 if(name.includes('supabase'))return {supabase:{}};
 throw Error(name);
 },module,module.exports);
 return renderToStaticMarkup(React.createElement(module.exports.BetaParticipant,{accept,enabled:true}));
}
const participant=cohort=>({id:'synthetic',cohort,expires_at:'2099-01-01T00:00:00Z',revoked_at:null,withdrawn_at:null,engagement_consent:false});
test('signed-out invitation asks for sign-in; matching account requires explicit consent; wrong account shows switch with no acceptance',()=>{
 const out=render({signedIn:false});assert.match(out,/Sign in to accept your invitation/);assert.doesNotMatch(out,/Accept invitation<\/button>/);
 const correct=render({review:{state:'ready',cohort:'plus'}});assert.match(correct,/This account matches/);assert.match(correct,/Signed in as/);assert.match(correct,/Temporary Plus Beta/);assert.match(correct,/type="checkbox" required/);
 const wrong=render({review:{state:'wrong_account'}});assert.match(wrong,/different MealCaddie account/);assert.match(wrong,/Switch accounts/);assert.doesNotMatch(wrong,/Accept invitation<\/button>/);
});
test('Free and temporary Plus welcome screens link into the app and keep feedback secondary without redundant consent',()=>{
 for(const cohort of ['free','plus']){const html=render({participation:participant(cohort)});assert.match(html,/Welcome to the MealCaddie beta/);assert.match(html,/href="\/".*Start exploring MealCaddie/);assert.match(html,/No subscription or payment was created/);assert.match(html,/Send beta feedback/);assert.doesNotMatch(html,/textarea|Accept invitation<\/button>|Refresh after/);if(cohort==='plus')assert.match(html,/expire automatically/);}
});
test('expired and revoked participation cannot claim active access; recovery is contextual',()=>{
 for(const item of [{...participant('plus'),expires_at:'2000-01-01T00:00:00Z'},{...participant('free'),revoked_at:'revoked'}]){const html=render({participation:item});assert.doesNotMatch(html,/Your beta access is active|Start exploring/);assert.match(html,/Continue to MealCaddie/);}
 assert.doesNotMatch(render(),/Try again<\/button>/);assert.match(render({recovery:true}),/Try again<\/button>/);
});
test('feedback has labelled usable categories, locked feature reporting, duplicate protection and account navigation',()=>{
 const html=render({participation:participant('free'),accept:false});for(const text of ['Bug report','Feature suggestion','General experience or usability','Signup, sign-in','Meal planning','Recipes and cooking','Pantry','Recipe Vault','Groceries','locked features'])assert.ok(html.includes(text),text);assert.match(html,/aria-describedby="feedback-help feedback-length"/);assert.match(html,/analytics and marketing consent are not required/);
 const source=readFileSync('components/beta-participant.tsx','utf8');assert.match(source,/if \(saving.current\) return/);assert.match(source,/rememberDestination/);assert.match(source,/scope: "local"/);assert.doesNotMatch(source,/setInterval/);
 const account=readFileSync('components/smart-cart-account-dialog.tsx','utf8');assert.match(account,/href="\/beta\/participant">Send beta feedback/);
});

