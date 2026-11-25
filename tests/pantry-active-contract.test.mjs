import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loader,withEnv} from './helpers/load-ts.mjs';
const load=loader(),recovery=load('lib/active-plan-pantry.ts'),forms=load('lib/pantry-preparation.ts'),contract=load('lib/pantry-recipe-contract.ts');
const original=JSON.parse(readFileSync(new URL('./fixtures/pantry-six-dinners.json',import.meta.url),'utf8'));
const at='2026-11-24T20:00:00Z';
const mapping={'Rice':'Dry white rice','Black beans':'Cooked black beans','Chickpeas':'Cooked chickpeas'};
const inventory=[['Rice',8,'cup'],['Black beans',6,'cup'],['Chickpeas',6,'cup'],['Carrots',8,'each'],['Onions',6,'each'],['Tomatoes',6,'each'],['Garlic cloves',12,'clove'],['Olive oil',16,'tbsp'],['Salt',4,'tsp'],['Black pepper',2,'tsp'],['Water',24,'cup']].map(([name,quantity,unit])=>({name:mapping[name]??name,quantity,unit,status:'owned'}));
const clarified=original.meals.map(m=>({...m,ingredients:m.ingredients.map(i=>({...i,name:mapping[i.name]??i.name}))}));

test('active recovery separates immutable original and current edits; owner/plan isolation survives serialized restart',()=>{
 const value=recovery.newActivePantry('one','plan',at,inventory),before=JSON.stringify(value.original);
 const edited=recovery.editActivePantry(value,[{...inventory[0],quantity:1},...inventory.slice(1),{name:'Unrelated custom ingredient',quantity:4,status:'owned'}],at);
 const restored=recovery.recoverActivePantry(JSON.parse(JSON.stringify(recovery.pantryRecoveryForStorage(edited))),'one');
 assert.equal(restored.current[0].quantity,1);assert.equal(JSON.stringify(restored.original),before);assert.equal(restored.current.length,11);
 assert.equal(recovery.recoverActivePantry(restored,'two'),null);assert.equal(recovery.activePantryForPlan(restored,'one',['different']),null);
 assert.equal(recovery.activePantryForPlan(restored,'one',['plan']).snapshotAt,at);
 for(const raw of [null,{},'{bad', {...restored,snapshotAt:'invalid'}])assert.equal(recovery.recoverActivePantry(raw,'one'),null);
});
test('explicit forms preserve cloud-compatible names and require remeasurement; generic entries remain unresolved',()=>{
 const pantry=load('lib/pantry.ts');
 for(const name of ['Rice','Black beans','Chickpeas']){
  assert.ok(forms.preparationIssue(name));const choices=forms.preparationChoices(name);assert.ok(choices.length);
  const chosen=forms.clarifyPreparation({name,quantity:6,unit:'cup',status:'owned'},choices.at(-1));
  assert.equal(chosen.quantity,undefined);assert.notEqual(chosen.name,name);
  const persisted=pantry.pantryCloudPayload([{...chosen,quantity:2}]);assert.equal(pantry.normalizePantry(persisted)[0].name,chosen.name);
 }
 assert.ok(forms.preparationIssue('Dried chickpeas'));assert.equal(forms.preparationIssue('Cooked chickpeas'),null);
 assert.equal(forms.pantryPreparationProblem(inventory),null);
});
test('six actual candidate dinners replay with explicit, separately confirmed forms and safe quantified prose',async()=>{
 const input={budget:60,householdSize:2,diet:'No preference',mealSourceMode:'pantry-only',pantryInventory:inventory,combinedPantryItems:inventory.map(i=>i.name).join(', '),availableEquipment:['Stovetop'],prepTime:'Under 1 hour'};
 let calls=0;
 class Provider{chat={completions:{create:async()=>{calls++;return {choices:[{message:{content:JSON.stringify({...original,meals:clarified})}}]};}}};}
 await withEnv({OPENAI_API_KEY:'mock-only'},async()=>{
  const fn=loader({openai:Provider,'./beta-pilot-ai':{pilotAIBudget:async()=>null}})('lib/meal-generation.ts').generateMealPlan;
  const r=await fn(input,'free'),body=await r.json();assert.equal(r.status,200,JSON.stringify(body));assert.equal(body.meals.length,6);assert.equal(calls,1);
  assert.doesNotMatch(JSON.stringify(body.meals),/side salad|Serve with a scoop of rice|Serve with rice or/);
  assert.ok(body.meals.every(m=>m.pantryOnly&&m.servings===2));assert.equal(body.estimated_total_cost,0);assert.deepEqual(body.restock_items,[]);
  const blocked=await fn({...input,pantryInventory:inventory.map(e=>({...e,name:e.name==='Dry white rice'?'Rice':e.name}))},'free');assert.equal(blocked.status,422);assert.equal(calls,1);
 });
});

const ingredients=clarified[0].ingredients;
const ids=ingredients.map((_,i)=>i);
const actions={prep_time_minutes:40,actions:[{action:'mix',ingredientIds:ids,minutes:5},{action:'simmer',ingredientIds:ids,minutes:30},{action:'serve',ingredientIds:ids,minutes:5}]};
test('structured contract cannot carry extra foods, changed amounts/forms or raw prose; renders only planned references',()=>{
 assert.deepEqual(contract.pantryRecipeProblems(actions,ingredients,60,['Stovetop']),[]);
 const steps=contract.renderPantryActions(actions,ingredients,2).join(' ');assert.match(steps,/2 portions/);assert.doesNotMatch(steps,/kimchi/);
 for(const extra of [{text:'Serve with kimchi'},{amount:'4 cups'},{form:'cooked'}])assert.equal(contract.pantryActionSchema.safeParse({...actions,actions:[{...actions.actions[0],...extra},...actions.actions.slice(1)]}).success,false);
 assert.ok(contract.pantryRecipeProblems({...actions,actions:[{action:'mix',ingredientIds:[999],minutes:1},...actions.actions.slice(1)]},ingredients,60,['Stovetop']).length);
 assert.ok(contract.pantryRecipeProblems(actions,ingredients,20,['Stovetop']).length);
 assert.ok(contract.pantryRecipeProblems(actions,ingredients,60,['Microwave']).length);
});
test('structured route preserves safety, stock, current forms and exact recipe ingredients with mock-only calls',async()=>{
 let calls=0;
 class Provider{chat={completions:{create:async()=>{calls++;return {choices:[{message:{content:JSON.stringify(actions)}}]};}}};}
 await withEnv({OPENAI_API_KEY:'mock-only'},async()=>{
  const api=loader({openai:Provider,'@/lib/product-access':{requireProductAccess:async()=>null},'@/lib/legal-agreements':{requireAgreements:async()=>null},'@/lib/server-membership':{getRequestMembership:async()=>({plan:'free',userId:'one'})},'@/lib/beta-pilot-ai':{pilotAIBudget:async()=>null}})('app/api/get-recipe/route.ts');
  const body={mealTitle:'Test',servings:2,ingredients,pantryOnly:true,pantryPlanId:'plan',maximumMinutes:60,pantryInventory:inventory,availableEquipment:['Stovetop'],diet:'No preference'};
  const req=body=>new Request('http://localhost/api/get-recipe',{method:'POST',body:JSON.stringify(body)});
  const response=await api.POST(req(body)),data=await response.json();assert.equal(response.status,200,JSON.stringify(data));assert.equal(calls,1);assert.equal(data.pantryContractVersion,1);
  assert.deepEqual(data.ingredients,ingredients.map(i=>i.amount+' '+i.name));
  for(const patch of [{diet:'Milk allergy'},{pantryInventory:[]},{pantryInventory:inventory.map(i=>({...i,quantity:0}))},{pantryInventory:inventory.map(i=>i.name==='Dry white rice'?{...i,name:'Rice'}:i)}]){
   const r=await api.POST(req({...body,...patch}));assert.equal(r.status,422);assert.equal(calls,1);
  }
 });
});
test('recipe source changes with Pantry Only provenance, while ordinary legacy keys retain their format',()=>{
 const {getRecipeSourceKey}=load('lib/recipe-ingredients.ts');const meal={name:'Rice',notes:'',servings:2,ingredients:[{name:'Rice',amount:'1 cup'}]};
 assert.equal(getRecipeSourceKey(meal),JSON.stringify(['Rice','',2,[['Rice','1 cup']]]));
 assert.notEqual(getRecipeSourceKey(meal),getRecipeSourceKey({...meal,pantryOnly:true,pantryPlanId:'one',pantryTimeLimit:60}));
 assert.notEqual(getRecipeSourceKey({...meal,pantryOnly:true,pantryPlanId:'one'}),getRecipeSourceKey({...meal,pantryOnly:true,pantryPlanId:'two'}));
});

test('active-plan hook requires fresh confirmation after reload, owner changes and cooking; reset and storage failure stay isolated',()=>{
 const disk=new Map();let fail=false,states=[],effects=[],cursor=0,pending=[];
 const React={useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useEffect(fn,deps){const i=cursor++;if(!effects[i]||deps.some((v,n)=>v!==effects[i][n])){effects[i]=deps;pending.push(fn);}}};
 const use=loader({react:React,'../lib/smart-cart-persistence':{loadStoredJson:key=>disk.get(key)??null,saveStoredJson:(key,value)=>{if(fail)return false;disk.set(key,JSON.parse(JSON.stringify(value)));return true;},clearStoredJson:key=>disk.delete(key)}})('hooks/use-active-plan-pantry.ts').useActivePlanPantry;
 const render=(owner='one')=>{cursor=0;const value=use(owner,true);const queue=pending;pending=[];queue.forEach(fn=>fn());return value;};
 render();let value=render();assert.equal(value.ready,true);assert.equal(value.confirmed,false);
 value.start('plan',at,inventory,true);value=render();assert.equal(value.confirmed,true);
 value.edit([{...inventory[0],quantity:3},...inventory.slice(1)]);value=render();assert.equal(value.record.original[0].quantity,8);assert.equal(value.record.current[0].quantity,3);
 value.invalidate();value=render();assert.equal(value.confirmed,false);value.confirm('plan',value.record.current);value=render();assert.equal(value.confirmed,true);
 // New hook instance represents reopening the browser with the same device data.
 states=[];effects=[];render();value=render();assert.equal(value.record.current[0].quantity,3);assert.equal(value.confirmed,false);
 assert.equal(render('two').record,null);assert.equal(render('two').record,null);render('one');value=render('one');assert.equal(value.record.planId,'plan');assert.equal(value.confirmed,false);
 fail=true;value.confirm('plan',value.record.current);value=render();assert.equal(value.storageFailed,true);assert.equal(value.record.owner,'one');fail=false;
 value.start('replacement',at,inventory,false);value=render();assert.equal(value.record.planId,'replacement');assert.equal(value.confirmed,false);
 value.reset();value=render();assert.equal(value.record,null);assert.equal(disk.has(recovery.activePantryKey('one')),false);
});

test('pantry metadata survives saved dessert/Vault JSON; stale or malformed metadata cannot authorize legacy recipes',()=>{
 const {pantryMealMetadata}=load('lib/pantry-meal-metadata.ts');
 const data={pantryOnly:true,pantryPlanId:'job-one',pantrySnapshotAt:at,pantryTimeLimit:60};
 assert.deepEqual(pantryMealMetadata(JSON.parse(JSON.stringify(data))),data);
 const invalid=pantryMealMetadata({pantryOnly:'true',pantryPlanId:3,pantrySnapshotAt:'invalid',pantryTimeLimit:999});assert.ok(Object.values(invalid).every(v=>v===undefined));
 const value=recovery.newActivePantry('one','job-one',at,inventory);
 assert.equal(recovery.recoverActivePantry({...value,planId:4},'one'),null);
 assert.equal(recovery.activePantryForPlan(value,'one',['job-two']),null);
});

export {inventory,clarified};
