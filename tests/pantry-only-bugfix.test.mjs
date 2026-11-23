import test from 'node:test';
import assert from 'node:assert/strict';
import {loader,withEnv} from './helpers/load-ts.mjs';

const input={budget:60,householdSize:2,diet:'No preference',combinedPantryItems:'Rice, Scallions',pantryInventory:[{name:'Rice',quantity:100,unit:'cup',status:'owned'},{name:'Scallions',quantity:100,unit:'each',status:'owned'}],mealSourceMode:'pantry-only',availableEquipment:['Stovetop'],prepTime:'Under 30 mins'};
const dish=(name='Rice with green onion',ingredients=[{name:'Rice',amount:'1 cup',price:0},{name:'Green onion',amount:'1',price:0}])=>({day:'Day 1',name,servings:2,description:'Tender rice with a crisp onion finish.',prep_time_minutes:20,ingredients});
const answer=meals=>({meals,desserts:[],estimated_total_cost:0,budget_summary:'Pantry suggestions',upgrade_available:false});
async function run(value,extra={},plan='free'){
 return withEnv({OPENAI_API_KEY:'mock-only'},async()=>{
  let calls=0;
  class Provider{chat={completions:{create:async()=>{calls++;if(value instanceof Error)throw value;return {choices:[{message:{content:JSON.stringify(value)}}]};}}};}
  const fn=loader({'openai':Provider,'./beta-pilot-ai':{pilotAIBudget:async()=>null}})('lib/meal-generation.ts').generateMealPlan;
  const response=await fn({...input,...extra},plan);
  return {status:response.status,body:await response.json(),calls};
 });
}
test('sparse pantry accepts one zero-cost suggestion and safe scallion equivalent',async()=>{
 const r=await run(answer([dish()]));
 assert.equal(r.status,200);assert.equal(r.calls,1);
 assert.equal(r.body.meals.length,1);
});
test('moderate and well-stocked pantry responses retain counts for Free and Plus',async()=>{
 for(const count of [3,7])for(const plan of ['free','plus']){
  const meals=Array.from({length:count},(_,i)=>dish(['Rice soup','Rice patties','Rice skillet','Rice salad','Steamed rice','Rice porridge','Baked rice'][i]));
  const r=await run(answer(meals),{availableEquipment:['Stovetop','Oven']},plan);
  assert.equal(r.status,200);assert.equal(r.body.meals.length,count);assert.equal(r.calls,1);
  assert.equal(r.body.estimated_total_cost,0);assert.equal(r.body.upgrade_available,false);
  assert.match(r.body.planning_notice,/Check the required amounts/);
  assert.equal(r.body.meals[0].ingredients[0].amount,'1 cup');
 }
});
test('renamed duplicate dishes are not used to fill seven dinners',async()=>{
 const r=await run(answer([dish('Scallion rice soup'),dish('Green onion rice soup')]));
 assert.equal(r.status,200);assert.equal(r.body.meals.length,1);
 assert.match(r.body.planning_notice,/Only 1 distinct/);
});
test('absent ingredients, no feasible meals, schema and provider failures have distinct responses',async()=>{
 for(const [response,extra,status,code] of [
  [answer([dish('Milk rice',[{name:'Milk',amount:'1 cup',price:0}])]),{},422,'PANTRY_INGREDIENT_UNAVAILABLE'],
  [answer([]),{},422,'PANTRY_NO_FEASIBLE_MEALS'],
  [answer([dish()]),{combinedPantryItems:''},400,'PANTRY_INPUT_EMPTY'],
  [answer([dish()]),{restock:['Rice','Scallions']},400,'PANTRY_INPUT_EMPTY'],
  [answer([dish('Rice',[])]),{},500,'GENERATION_RESPONSE_INVALID'],
  [new Error('mock failure'),{},500,'GENERATION_PROVIDER_FAILED'],
 ]){
  const r=await run(response,extra);assert.equal(r.status,status);assert.equal(r.body.code,code);
  assert.ok(r.calls<=3);if(status===400)assert.equal(r.calls,0);
 }
});
test('ordinary planning still requires seven dinners and positive costs',async()=>{
 const r=await run(answer([dish()]),{mealSourceMode:'pantry-and-store'});
 assert.equal(r.status,500);assert.equal(r.body.code,'GENERATION_RESPONSE_INVALID');
 const meals=Array.from({length:7},(_,i)=>dish('Rice dinner '+i,[{name:'Rice',amount:'1 cup',price:1}]));
 const normal=await run({...answer(meals),estimated_total_cost:7},{mealSourceMode:'pantry-and-store'});
 assert.equal(normal.status,200);assert.equal(normal.body.meals.length,7);
});
test('availability and prompt use reviewed equivalents and exclude restock intentions',()=>{
 const {availablePantryNames,pantryMatchKey}=loader()('lib/pantry-availability.ts');
 const names=availablePantryNames({combinedPantryItems:'Rice, Salt',runningLow:['Scallions'],fullyStocked:['Milk'],restock:['Milk','Salt']});
 assert.deepEqual(names,['Rice','Scallions']);
 for(const [a,b] of [['Scallions','Green onions'],['Courgette','Zucchini'],['Garlic cloves, minced','Garlic'],['Jalapeño','Jalapeno']])assert.equal(pantryMatchKey(a),pantryMatchKey(b));
 for(const [a,b] of [['Garlic','Garlic powder'],['Fresh basil','Dried basil'],['Milk','Almond milk'],['Soy sauce','Gluten-free soy sauce'],['Rice','Brown rice']])assert.notEqual(pantryMatchKey(a),pantryMatchKey(b));
 assert.equal(pantryMatchKey('Milk or water'),'');
 const {generationPantryNames}=loader()('lib/pantry.ts');
 assert.deepEqual(generationPantryNames([{name:'Rice',status:'owned'},{name:'Milk',status:'restock',quantity:1},{name:'Salt',status:'low',quantity:0}]),['Rice']);
});
test('validator recognizes scallions without equating garlic with powder',()=>{
 const {planConstraintIssues}=loader()('lib/meal-quality.ts');
 assert.deepEqual(planConstraintIssues(answer([dish()]),input),[]);
 assert.ok(planConstraintIssues(answer([dish('Garlic rice',[{name:'Garlic powder',price:0}])]),{...input,combinedPantryItems:'Garlic'}).length);
 assert.ok(planConstraintIssues(answer([dish('Rice soup',[{name:'Water',amount:'1 cup',price:0}])]),input).length);
});

test('generated requirements keep unknown amounts unresolved and subtract measured inventory once',async()=>{
 const r=await run(answer([dish()]));
 const {deriveGroceryLists}=loader()('lib/grocery-list.ts');
 const base={weeklyMenu:r.body.meals,savedDesserts:[],fullyStocked:new Set(['Rice']),runningLow:new Set(),restock:new Set()};
 const unknown=deriveGroceryLists({...base,pantryEntries:[{name:'Rice',status:'stocked'},{name:'Scallions',status:'owned'}]});
 assert.equal(unknown.skippedGroceryList.length,0);
 assert.equal(unknown.checkPantryList.length,2);
 assert.ok(unknown.checkPantryList.every(row=>/Amount unknown/.test(row.pantry_note)));
 const partial=deriveGroceryLists({...base,pantryEntries:[{name:'Rice',quantity:0.5,unit:'cup',status:'low'},{name:'Scallions',quantity:1,unit:'each',status:'owned'}]});
 assert.equal(partial.derivedGroceryList.find(row=>row.item_key==='rice').shortage_amount,'0.5 cups');
 assert.equal(partial.skippedGroceryList.length,1);
});

test('pantry desserts use zero purchase costs and cannot introduce unavailable ingredients',async()=>{
 const dessert={title:'Scallion treat',description:'Synthetic validator fixture only.',prep_time_minutes:15,ingredients:[{name:'Scallions',amount:'1',price:0}]};
 const r=await run({...answer([dish()]),desserts:[dessert]},{includeDessert:true});
 assert.equal(r.status,200);assert.equal(r.body.desserts[0].ingredients[0].price,0);assert.deepEqual(r.body.restock_items,[]);
 const unavailable=await run({...answer([dish()]),desserts:[{...dessert,ingredients:[{name:'Milk',amount:'1 cup',price:0}]}]},{includeDessert:true});
 assert.equal(unavailable.status,422);assert.equal(unavailable.body.code,'PANTRY_INGREDIENT_UNAVAILABLE');
});

test('pantry prompts share the validator inventory and do not demand seven dinners or purchase prices',()=>{
 const {buildGenerateListPrompts}=loader()('lib/meal-prompt-builders.ts');
 const p=buildGenerateListPrompts({...input,fullyStocked:['Milk'],restock:['Milk'],runningLow:['Scallions'],selectedEquipment:'Stovetop',adventureGuidance:'',adventureLevel:'Mix it up',applyUpgrades:false,avoidancePromptBlock:'',cuisinePromptBlock:'',dietaryPromptBlock:'Vegetarian',existingMeals:'',mustHavePromptBlock:'',includeDessert:false});
 assert.match(p.systemPrompt,/Return 0 to 7/);assert.match(p.systemPrompt,/price: 0/);
 assert.doesNotMatch(p.systemPrompt,/Return exactly 7 dinner meals/);
 assert.match(p.userPrompt,/Pantry Items: Rice, Scallions/);
 assert.doesNotMatch(p.userPrompt,/Fully Stocked Pantry Items: Milk/);
});

test('synthetic worker completes a short plan without changing existing plan quotas or ownership',async()=>{
 for(const plan of ['free','plus']){
  const job={id:'11111111-1111-4111-8111-111111111111',user_id:'owner-'+plan,plan,attempts:1,input:{...input}};
  let calls=0,finished;
  class Provider{chat={completions:{create:async()=>{calls++;return {choices:[{message:{content:JSON.stringify(answer([dish()]))}}]};}}};}
  const load=loader({openai:Provider,'./product-access':{productAccessForUser:async()=>({allowed:true}),productGateEnabled:()=>true},'./legal-agreements':{agreementsForUser:async()=>true},'./beta-feature-membership':{loadFeaturePlan:async id=>{assert.equal(id,job.user_id);return plan;}},'./generation-jobs':{claimGenerationJob:async()=>({job}),finishGenerationJob:async(...args)=>{finished=args;}},'./generation-meal-history':{recentGenerationMeals:async()=>({recentMeals:[]})},'./beta-plan-engagement':{recordPlanEngagement:async()=>{}},'./beta-pilot-ai':{pilotAIBudget:async()=>null}});
  await withEnv({OPENAI_API_KEY:'mock-only'},()=>load('lib/generation-worker.ts').processGenerationJob(job.id));
  assert.equal(finished[0].user_id,job.user_id);assert.equal(finished[1],'completed');assert.equal(finished[2].meals.length,1);assert.equal(calls,1);
  assert.equal(load('lib/generation-request.ts').generationLimits(plan).limit,plan==='plus'?20:5);
 }
});
