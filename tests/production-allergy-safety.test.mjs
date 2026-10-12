import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {readFileSync} from 'node:fs';import {createRequire} from 'node:module';import ts from 'typescript';import path from 'node:path';
const require=createRequire(import.meta.url),baseline='394e33d8179cb578f5e81eeaa2a27f57f1ac269b';
function fixture(ref,answer,savedJob){let calls=0;const finishes=[];const cache=new Map();class Mock{chat={completions:{create:async()=>{calls++;return {choices:[{message:{content:JSON.stringify(answer)}}]};}}};}
function load(file){if(cache.has(file))return cache.get(file);const module={exports:{}};cache.set(file,module.exports);const source=ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):readFileSync(file,'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
new Function('require','module','exports',code)(name=>name.endsWith('generation-identity')?{generationIdentity:async()=>({owner:'verified-owner'})}:name.endsWith('generation-jobs')?{claimGenerationJob:async()=>({job:savedJob}),finishGenerationJob:async(...args)=>finishes.push(args),readGenerationJob:async()=>savedJob,publicGenerationJob:job=>job,reserveGenerationJob:async()=>{throw Error('Reservation must not run');}}:name.endsWith('generation-dispatch')?{dispatchGenerationJob:async()=>{}}:name==='openai'?Mock:name==='next/server'?{NextResponse:{json:(b,o)=>Response.json(b,o)}}:name.endsWith('server-membership')?{getRequestMembership:async()=>({plan:'free'})}:name.startsWith('@/')||name.startsWith('.')?load((name.startsWith('@/')?name.slice(2):path.posix.normalize(path.posix.join(path.posix.dirname(file),name)))+'.ts'):require(name),module,module.exports);return module.exports;}
return {load,finishes,get calls(){return calls;}};}
const plan={meals:Array.from({length:7},(_,i)=>({day:'Day '+i,name:'Rice plate '+i,notes:'Rice with water',ingredients:[{name:'Rice',amount:'1 cup',price:1}]})),breakfasts:[],lunches:[],estimated_total_cost:7,budget_summary:'Disposable',upgrade_available:false,desserts:[]};
const cases=[['Milk allergy','Milk'],['Sesame allergy','Tahini'],['Soy allergy','Tofu'],['Shellfish allergy','Prawns'],['Peanut allergy','Groundnuts'],['Dairy-free','Sodium caseinate']];
process.env.OPENAI_API_KEY='isolated-mock-no-network';
for(const [diet,ingredient] of cases)test('before/after production recipe: '+diet+' / '+ingredient,async()=>{
 for(const ref of [baseline,null]){const f=fixture(ref,{title:'Test',prep_time_minutes:10,ingredients:diet==='Sesame allergy'?['Rice']:[ingredient],steps:['Cook rice.',diet==='Sesame allergy'?'Substitute tahini for oil.':'Prepare '+ingredient+'.','Serve.']});
 const r=await f.load('app/api/get-recipe/route.ts').POST(new Request('http://isolated.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mealTitle:'Test',diet})}));assert.equal(r.status,ref?200:422);assert.equal(f.calls,ref?1:0);if(!ref)assert.equal((await r.json()).code,'ALLERGY_GENERATION_RESTRICTED');}
});
for(const [diet,desserts,restock] of [['Nut-free',[{title:'Peanut treat',description:'Peanut butter',ingredients:[{name:'Peanut butter',amount:'1 tbsp',price:1}]}],[]],['Dairy-free',[],['Milk']]])test('before/after weekly '+diet+' dessert/restock',async()=>{for(const ref of [baseline,null]){const f=fixture(ref,{...plan,desserts});const r=await f.load('lib/meal-generation.ts').generateMealPlan({budget:75,diet,householdSize:2,combinedPantryItems:'Rice',includeDessert:!!desserts.length,restock},'free');assert.equal(r.status,ref?200:422);assert.equal(f.calls,ref?1:0);}});
test('all nine allergens, multiple restrictions, custom allergy descriptions and ambiguous composition fail closed',()=>{
 const f=fixture(null,{}),{allergySafetyErrors}=f.load('lib/allergy-safety.ts');
 for(const diet of ['Milk allergy','Egg allergy','Fish allergy','Crustacean shellfish allergy','Tree nut allergy','Peanut allergy','Wheat allergy','Soy allergy','Sesame allergy','Milk and sesame allergies','Kiwi allergy','Allergic to unknown ingredients','Dairy-free','Nut-free','Gluten-free','No shellfish','Sesame-free'])assert.ok(allergySafetyErrors({diet}).length,diet);
 for(const diet of ['Vegetarian','Vegan','Halal','Kosher','Low sodium','No preference','No specific diet provided'])assert.equal(allergySafetyErrors({diet}).length,0,diet);
});
test('missing context and allergy-dependent transformations are refused; no raw dietary data is echoed',async()=>{
 const f=fixture(null,[{name:'Milk',price:1}]);const route=f.load('app/api/consolidate-ingredients/route.ts');
 const r=await route.POST(new Request('http://isolated.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ingredients:['uncertain sauce']})}));assert.equal(r.status,422);assert.equal(f.calls,0);assert.doesNotMatch(JSON.stringify(await r.json()),/uncertain sauce/);
 assert.ok(f.load('lib/allergy-safety.ts').allergySafetyErrors({},true).length);
});
test('ordinary weekly planning remains available with existing provider settings',async()=>{
 const f=fixture(null,plan);const r=await f.load('lib/meal-generation.ts').generateMealPlan({budget:75,diet:'No preference',householdSize:2,combinedPantryItems:'Rice'},'free');assert.equal(r.status,200);assert.equal(f.calls,1);
});
test('cached completed allergy-dependent results are blocked without modifying the stored job',async()=>{
 const original={id:'11111111-1111-4111-8111-111111111111',status:'completed',input:{diet:'Milk allergy'},result:{meals:[{ingredients:[{name:'Milk'}]}]}};
 for(const ref of [baseline,null]){const job=structuredClone(original),f=fixture(ref,{},job);const r=await f.load('app/api/generate-list/route.ts').GET(new Request('http://isolated.invalid/api/generate-list?id='+job.id));assert.equal(r.status,ref?200:422);assert.deepEqual(job,original);assert.equal(f.calls,0);}
});
test('new allergy requests stop before quota reservation, and example plans cannot bypass restriction',async()=>{
 for(const endpoint of ['generate-list','meal-plan']){const f=fixture(null,plan);const body=endpoint==='generate-list'?{budget:75,diet:'Soy allergy',householdSize:2,combinedPantryItems:'Rice'}:{weeklyBudget:75,householdSize:2,dietaryRestrictions:'Soy allergy',prepTimeAvailable:'Under 30 mins',adventureLevel:'Mix it up',pantryCheck:'Rice',strictStretchMode:false};const r=await f.load('app/api/'+endpoint+'/route.ts').POST(new Request('http://isolated.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));assert.equal(r.status,422);assert.equal(f.calls,0);}
});
test('unclassified custom text is not silently considered safe and ordinary combined preferences still work',()=>{
 const {allergySafetyErrors}=fixture(null,{}).load('lib/allergy-safety.ts');for(const diet of ['Kiwi','Groundnuts','Prawns','Milk; Kiwi allergy','unknown powder-free'])assert.ok(allergySafetyErrors({diet},true).length);assert.equal(allergySafetyErrors({diet:'Vegetarian, low sodium',avoidIngredients:'mushrooms'},true).length,0);
});
test('previously queued allergy work finishes failed with no AI usage and no content mutation',async()=>{
 const job={id:'11111111-1111-4111-8111-111111111111',user_id:null,plan:'guest',attempts:1,input:{budget:75,diet:'Milk allergy',householdSize:2,combinedPantryItems:'Milk'}};
 const original=structuredClone(job),f=fixture(null,plan,job);await f.load('lib/generation-worker.ts').processGenerationJob(job.id);assert.equal(f.calls,0);assert.equal(f.finishes[0][1],'failed');assert.equal(f.finishes[0][2],null);assert.deepEqual(f.finishes[0][4],[]);assert.deepEqual(job,original);
});
test('pantry-only treats and replacement meals cannot bypass declared allergy restrictions',async()=>{
 for(const [endpoint,input] of [['replace-dessert',{rejectedDessertTitle:'Cookies',budget:75,diet:'Milk allergy',householdSize:2,combinedPantryItems:'Milk',mealSourceMode:'pantry-only'}],['replace-meal',{rejectedMealTitle:'Old rice',budget:75,diet:'Shellfish allergy',householdSize:2,combinedPantryItems:'Prawns'}]]){const f=fixture(null,{});const r=await f.load('app/api/'+endpoint+'/route.ts').POST(new Request('http://isolated.invalid',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)}));assert.equal(r.status,422);assert.equal(f.calls,0);}
});
