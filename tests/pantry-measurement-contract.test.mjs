import test from 'node:test';
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync,mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {recordSyntheticQuantityDiagnostics} from './helpers/synthetic-quantity-diagnostics.mjs';
import {loader,withEnv} from './helpers/load-ts.mjs';
import {measuredFixture} from './helpers/local-real-provider-scope.mjs';

const load=loader();
const {fitPantryPlan}=load('lib/pantry-plan-quantities.ts');
const input={budget:60,householdSize:2,diet:'No preference',mealSourceMode:'pantry-only',combinedPantryItems:measuredFixture.map(r=>r[0]).join(', '),pantryInventory:measuredFixture.map(([name,quantity,unit])=>({name,quantity,unit,status:'owned'})),availableEquipment:['Stovetop'],prepTime:'Under 1 hour'};
const ingredient=(name,amount)=>({name,amount,price:0});
const dish=(name,ingredients)=>({name,day:'Day 1',servings:2,description:'Synthetic test recipe, not a culinary validation.',prep_time_minutes:35,ingredients});
const dinner=dish('Chickpea tomato skillet',[ingredient('Chickpeas','2 cup'),ingredient('Tomatoes','2 each'),ingredient('Onions','1 each'),ingredient('Garlic cloves','2 clove'),ingredient('Olive oil','1 tbsp'),ingredient('Salt','1/2 tsp'),ingredient('Black pepper','1/4 tsp')]);
const answer=meals=>({meals,desserts:[],estimated_total_cost:0,budget_summary:'Synthetic pantry test',upgrade_available:false});
const replaceAmount=(name,amount)=>({...dinner,ingredients:dinner.ingredients.map(i=>i.name===name?{...i,amount}:i)});
async function generate(responses,extra={},plan='free'){
 const clarify=value=>typeof value==='string'?value.replace(/\bRice\b/g,'Dry white rice').replace(/\bChickpeas\b/g,'Cooked chickpeas').replace(/\bBlack beans\b/g,'Cooked black beans'):Array.isArray(value)?value.map(clarify):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clarify(v)])):value;
 const prompts=[];let calls=0;
 class Provider{chat={completions:{create:async({messages})=>{prompts.push(messages.map(m=>m.content).join('\n'));const value=clarify(responses[Math.min(calls++,responses.length-1)]);return {choices:[{message:{content:JSON.stringify(value)}}]};}}};}
 return withEnv({OPENAI_API_KEY:'mock-only'},async()=>{
  const api=loader({openai:Provider,'./beta-pilot-ai':{pilotAIBudget:async()=>null}})('lib/meal-generation.ts');
  const response=await api.generateMealPlan(clarify({...input,...extra}),plan);
  return {status:response.status,body:await response.json(),calls,prompts};
 });
}

test('eleven-ingredient fixture accepts tsp seasonings, cloves, count vegetables and fractional amounts',()=>{
 const before=JSON.stringify(input);
 const rice=dish('Black bean rice soup',[ingredient('Rice','1/2 cup'),ingredient('Black beans','2 cup'),ingredient('Carrots','2 each'),ingredient('Water','3 cup'),ingredient('Salt','0.25 tsp')]);
 const result=fitPantryPlan([dinner,rice],[],input);
 assert.equal(result.meals.length,2);assert.deepEqual(result.rejections,[]);assert.equal(JSON.stringify(input),before);
});

test('plausible original-fixture mismatches produce precise synthetic diagnostics',()=>{
 const cases=[['Salt','1 pinch','UNIT_UNSUPPORTED'],['Black pepper','1 package','UNIT_UNSUPPORTED'],['Garlic cloves','2 each','UNIT_INCOMPATIBLE'],['Carrots','1 cup','UNIT_INCOMPATIBLE'],['Chickpeas','200 g','UNIT_INCOMPATIBLE'],['Salt','to taste','AMOUNT_INVALID']];
 const diagnostics=cases.map(([name,amount,reason])=>{
  const base=name==='Carrots'?{...dinner,ingredients:[ingredient('Carrots',amount)]}:replaceAmount(name,amount);
  const result=fitPantryPlan([base],[],input);assert.equal(result.meals.length,0);
  const rejection=result.rejections[0];assert.equal(rejection.reason,reason);assert.equal(rejection.ingredient,name);assert.equal(rejection.requestedAmount,amount);
  assert.equal(rejection.availableUnit,input.pantryInventory.find(i=>i.name===name.replace(' cloves','')).unit);
  assert.ok(rejection.availableQuantity>0);return rejection;
 });
 if(process.env.MEALCADDIE_SYNTHETIC_QUANTITY_RECEIPT)writeFileSync(process.env.MEALCADDIE_SYNTHETIC_QUANTITY_RECEIPT,JSON.stringify({syntheticOnly:true,providerCalls:0,diagnostics},null,2));
});

test('same-dimension tbsp/tsp, mass and volume conversions remain valid; packages and pinch do not',()=>{
 assert.equal(fitPantryPlan([replaceAmount('Salt','1 tbsp')],[],input).meals.length,1);
 assert.equal(fitPantryPlan([replaceAmount('Olive oil','3 tsp')],[],input).meals.length,1);
 const volume={...input,pantryInventory:input.pantryInventory.map(i=>i.name==='Chickpeas'?{...i,quantity:2000,unit:'ml'}:i)};
 assert.equal(fitPantryPlan([dinner],[],volume).meals.length,1);
 const mass={...input,pantryInventory:[{name:'Chickpeas',quantity:1,unit:'kg',status:'owned'}]};
 assert.equal(fitPantryPlan([dish('Beans',[ingredient('Chickpeas','250 g')])],[],mass).meals.length,1);
});

test('overlapping stock and trial rollback stay conservative; no raw/cooked or package inference',()=>{
 const first=dish('Beans',[ingredient('Chickpeas','4 cup')]);
 const result=fitPantryPlan([first,dish('Soup',[ingredient('Chickpeas','3 cup')]),dinner],[],input);
 assert.equal(result.meals.length,2);assert.equal(result.rejections[0].reason,'STOCK_INSUFFICIENT');assert.equal(result.rejections[0].availableQuantity,2);
 for(const name of ['Cooked rice','Dry chickpeas','Garlic powder'])assert.equal(fitPantryPlan([dish('Test',[ingredient(name,'1 cup')])],[],input).meals.length,0);
 const unknown={...input,pantryInventory:input.pantryInventory.map(i=>i.name==='Salt'?{name:'Salt',status:'stocked'}:i)};
 assert.equal(fitPantryPlan([dinner],[],unknown).rejections[0].reason,'STOCK_UNMEASURED');
});

test('Pantry Only contract specifies canonical stock units and never recommends pinch',()=>{
 const {buildGenerateListPrompts}=load('lib/meal-prompt-builders.ts');
 const args={...input,pantryAmounts:JSON.stringify(input.pantryInventory),fullyStocked:[],runningLow:[],restock:[],selectedEquipment:'Stovetop',adventureGuidance:'',adventureLevel:'Mix it up',applyUpgrades:false,avoidancePromptBlock:'',cuisinePromptBlock:'',dietaryPromptBlock:'No preference',existingMeals:'',mustHavePromptBlock:'',includeDessert:false};
 const prompt=buildGenerateListPrompts(args).systemPrompt;
 assert.match(prompt,/corresponding.*pantry.*unit/i);assert.match(prompt,/positive decimal or fraction/i);assert.match(prompt,/garlic.*clove/i);assert.doesNotMatch(prompt,/use "1 pinch"/i);assert.match(prompt,/Never infer.*density/i);
 const normal=buildGenerateListPrompts({...args,mealSourceMode:'pantry-and-store'}).systemPrompt;
 assert.doesNotMatch(normal,/PANTRY MEASUREMENT CONTRACT/);assert.match(normal,/Return exactly 7 dinner meals/);
});

test('one targeted measurement correction revalidates all restrictions and accepts compatible response',async()=>{
 for(const plan of ['free','plus']){
  const result=await generate([answer([replaceAmount('Salt','1 pinch')]),answer([dinner])],{},plan);
  assert.equal(result.status,200);assert.equal(result.calls,2);assert.equal(result.body.meals.length,1);
  assert.match(result.prompts[1],/MEASUREMENT CORRECTION/);assert.match(result.prompts[1],/UNIT_UNSUPPORTED/);assert.match(result.prompts[1],/Salt/);
  assert.deepEqual(result.body.restock_items,[]);assert.equal(result.body.estimated_total_cost,0);
  assert.ok(!('rejections' in result.body));
 }
});

test('persistent incompatible output stops after one quantity correction and blames generated measurements',async()=>{
 const result=await generate([answer([replaceAmount('Salt','1 pinch')])]);
 assert.equal(result.status,422);assert.equal(result.calls,2);assert.equal(result.body.code,'PANTRY_MEASUREMENTS_INCOMPATIBLE');assert.match(result.body.error,/generated ingredient measurements/i);assert.doesNotMatch(result.body.error,/Enter a measured amount instead of a package/);
});

test('stock insufficiency is not a generated-unit failure and does not spend a correction',async()=>{
 const result=await generate([answer([{...dinner,ingredients:[ingredient('Chickpeas','7 cup')]}])]);
 assert.equal(result.status,422);assert.equal(result.calls,1);assert.equal(result.body.code,'PANTRY_QUANTITIES_UNSATISFIED');assert.match(result.body.error,/stock/i);
});

test('a valid dinner survives incompatible alternatives and treats without another request',async()=>{
 const bad=replaceAmount('Salt','1 pinch');
 const dessert={title:'Synthetic rice pudding',description:'Validation fixture only',prep_time_minutes:25,ingredients:[ingredient('Rice','1 bag')]};
 const good=dish('Black bean rice soup',[ingredient('Rice','1 cup'),ingredient('Black beans','2 cup'),ingredient('Water','3 cup')]);
 const result=await generate([{...answer([bad,good]),desserts:[dessert]}],{includeDessert:true});
 assert.equal(result.status,200);assert.equal(result.calls,1);assert.equal(result.body.meals.length,1);assert.deepEqual(result.body.desserts,[]);
 assert.match(result.body.planning_notice,/2 options were omitted/);
 const diagnostics=fitPantryPlan([good],[dessert],input).rejections[0];assert.equal(diagnostics.dish,'dessert');assert.equal(diagnostics.reason,'UNIT_UNSUPPORTED');
});

test('measurement retry cannot admit wrong servings, time, equipment, unavailable ingredients or true dietary restrictions',async()=>{
 const bad=answer([replaceAmount('Salt','1 pinch')]);
 const violations=[{...dinner,servings:4},{...dinner,prep_time_minutes:90},{...dinner,name:'Oven baked chickpeas',notes:'Bake in oven'},{...dinner,ingredients:[...dinner.ingredients,ingredient('Milk','1 cup')]}];
 for(const meal of violations){const result=await generate([bad,answer([meal])]);assert.equal(result.status,422);assert.ok(result.calls<=3);}
 for(const diet of ['Milk allergy','Lactose intolerance','Diabetic medical diet','unclear restriction']){
  const result=await generate([answer([dinner])],{diet});assert.equal(result.status,422);assert.equal(result.calls,0);
 }
});

test('shared three-request ceiling includes schema and quantity corrections',async()=>{
 const malformed={...answer([dinner]),meals:[{...dinner,ingredients:[]}]};
 const result=await generate([malformed,answer([replaceAmount('Salt','1 pinch')]),answer([dinner])]);
 assert.equal(result.calls,3);assert.equal(result.status,200);
 const exhausted=await generate([{...malformed,meals:Array(8).fill(malformed.meals[0])},malformed,answer([replaceAmount('Salt','1 pinch')])]);
 assert.ok(exhausted.calls<=3);assert.equal(exhausted.status,422);
});

test('local synthetic recorder keeps rejected measurement fields without raw responses or credentials',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'mc-synthetic-quantity-'));
 try{
  const file=path.join(dir,'receipt.json');
  const body={choices:[{message:{content:JSON.stringify({...answer([replaceAmount('Salt','1 pinch')]),privateNotes:'not-for-receipt'})}}],ignoredCredential:'never-persist-this-field'};
  recordSyntheticQuantityDiagnostics(file,{status:200,body},1);
  recordSyntheticQuantityDiagnostics(file,{status:200,body:{choices:[{message:{content:'null'}}]}},2);
  recordSyntheticQuantityDiagnostics(file,{status:500,body:{}},2);
  recordSyntheticQuantityDiagnostics(file,{status:200,body:{choices:[{message:{content:JSON.stringify(answer([dinner]))}}]}},2);
  const text=readFileSync(file,'utf8'),receipt=JSON.parse(text);
  assert.equal(receipt.syntheticOnly,true);assert.equal(receipt.notApplicationAcceptance,true);
  assert.equal(receipt.attempts.length,2);
  assert.equal(receipt.attempts[0].rejections[0].requestedUnit,'pinch');assert.deepEqual(receipt.attempts[1].rejections,[]);
  assert.doesNotMatch(text,/never-persist|privateNotes|choices|message/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
