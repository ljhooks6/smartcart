import test from 'node:test';import assert from 'node:assert/strict';import {loader} from './helpers/load-ts.mjs';import {cases} from '../evals/recipe-quality-cases.mjs';
const load=loader();const {recipeDescription}=load('lib/recipe-description.ts');const {planConstraintIssues,culinaryReview}=load('lib/meal-quality.ts');
const meal=(name='Chicken soup',ingredients=[{name:'Chicken breast',price:3}])=>({name,description:'Tender chicken in a bright, savory broth with a comforting finish.',ingredients});
test('finished-dish descriptions remain separate from steps and legacy cooking notes',()=>{
 assert.match(recipeDescription(meal()),/Tender chicken/);
 for(const notes of ['Coat chicken with oil. Bake for 20 minutes.','Heat oil. Add carrots.','Simmer rice. Serve.'])assert.match(recipeDescription({notes}),/description wasn’t saved/);
 const old={notes:'Tender chicken with golden potatoes and a bright lemon sauce.',instructions:['Heat oil.']};assert.equal(recipeDescription(old),old.notes);assert.deepEqual(old.instructions,['Heat oil.']);
});
test('pantry-only availability outranks variety and keeps restock ingredients unavailable',()=>{
 const input={budget:60,householdSize:2,mealSourceMode:'pantry-only',combinedPantryItems:'Chicken breast, Rice',restock:['Milk']};
 assert.deepEqual(planConstraintIssues({meals:[meal()]},input),[]);
 assert.ok(planConstraintIssues({meals:[meal('Soup',[{name:'Milk',price:2}])]},input).length);
 assert.equal(culinaryReview({meals:Array.from({length:7},()=>meal('Chicken rice bowl'))},true).repetition.length,2);
 assert.equal(culinaryReview({meals:Array.from({length:7},()=>meal('Chicken rice bowl'))},true).issues.length,0);
});
test('desserts and optional meals count toward the budget; historical saved records are untouched',()=>{
 const saved={meals:[meal()]},original=structuredClone(saved);
 assert.ok(planConstraintIssues({...saved,desserts:[meal('Brownie',[{name:'Chocolate',price:8}])]}, {budget:10,householdSize:2}).length);
 assert.deepEqual(saved,original);assert.equal(cases.length,10);assert.equal(new Set(cases.map(c=>c.id)).size,10);
});

const {writeDiet}=load('lib/dietary-safety.ts');const settings=(allergies=[],extra={})=>writeDiet('No preference',{allergies,preferences:[],customAllergies:'',intolerances:'',medical:'',...extra});
const candidate=load('lib/dietary-candidate.ts');
test('candidate remains disabled by default and cannot open production allergy generation',async()=>{
 const original={flag:process.env.MEALCADDIE_DIETARY_CANDIDATE,env:process.env.VERCEL_ENV};
 try{delete process.env.MEALCADDIE_DIETARY_CANDIDATE;assert.equal(candidate.dietaryCandidateEnabled(),false);process.env.MEALCADDIE_DIETARY_CANDIDATE='true';process.env.VERCEL_ENV='production';assert.equal(candidate.dietaryCandidateEnabled(),false);const r=load('lib/food-safety-response.ts').foodSafetyResponse({diet:settings(['Milk'])},true);assert.equal(r.status,422);assert.equal((await r.json()).code,'ALLERGY_GENERATION_RESTRICTED');}finally{for(const [k,v] of [['MEALCADDIE_DIETARY_CANDIDATE',original.flag],['VERCEL_ENV',original.env]])if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
test('candidate accepts explicit supported controls and rejects known conflicts across all returned food sections',()=>{
 for(const [allergy,food] of [['Milk','Sodium caseinate'],['Eggs','Mayonnaise'],['Fish','Anchovies'],['Crustacean shellfish','Prawns'],['Tree nuts','Cashews'],['Peanuts','Groundnuts'],['Wheat','Semolina'],['Soy','Tofu'],['Sesame','Tahini']]){
  const input={diet:settings([allergy])};assert.deepEqual(candidate.candidatePolicy(input).errors,[]);
  for(const section of ['meals','breakfasts','lunches','desserts'])assert.ok(candidate.candidateOutputIssues({[section]:[{ingredients:[{name:food}]}]},input).some(s=>s.includes(allergy)),allergy+section);
 }
 assert.deepEqual(candidate.candidateOutputIssues({ingredients:[{name:'Rice'},{name:'Chicken breast'}]},{diet:settings(['Milk','Sesame'])}),[]);
 assert.ok(candidate.candidateOutputIssues({restock_items:[{item:'Milk [RESTOCK]'}]},{diet:settings(['Milk'])}).length);
 assert.ok(candidate.candidateOutputIssues({ingredients:['Rice'],steps:['Substitute tahini for oil.']},{diet:settings(['Sesame'])}).length);
});
test('ambiguous composites, medical claims, custom restrictions and unknown fields fail closed',()=>{
 for(const food of ['pesto','sauce','dairy-free almond milk','natural flavors','seasoning blend','chocolate','broth'])assert.ok(candidate.candidateOutputIssues({ingredients:[{name:food}]},{diet:settings(['Milk'])}).length,food);
 assert.ok(candidate.candidatePolicy({diet:settings([],{customAllergies:'kiwi'})}).errors.length);
 assert.ok(candidate.candidatePolicy({diet:settings([],{medical:'renal diet'})}).errors.length);
 assert.ok(candidate.candidatePolicy({diet:settings([],{intolerances:'histamine'})}).errors.length);
 assert.ok(candidate.candidatePolicy({diet:settings().replace('"medical":""','"medical":"","unknown":"milk allergy"')}).errors.length);
 assert.ok(candidate.candidateOutputIssues({description:'Certified allergy-safe rice',ingredients:[{name:'Rice'}]},{diet:settings(['Milk'])}).length);
 assert.ok(candidate.candidateOutputIssues({ingredients:[{name:'Carrots'}]},{diet:settings(),avoidIngredients:'carrots'}).length);
 assert.deepEqual(candidate.candidatePolicy({diet:settings([],{intolerances:'lactose'})}).settings.allergies,['Milk']);
});

test('time, household size and named dessert components are constraints rather than impressive labels',()=>{
 assert.ok(planConstraintIssues({meals:[{...meal(),prep_time_minutes:60}]},{budget:60,householdSize:2,prepTime:'Under 30 minutes'}).length);
 assert.ok(planConstraintIssues({meals:[{...meal(),servings:6}]},{budget:60,householdSize:2}).length);
 assert.ok(planConstraintIssues({meals:[],desserts:[meal('Lemon Blueberry Streusel Muffins',[{name:'Sugar',price:1}])]},{budget:60,householdSize:2}).length);
});

test('saved original restrictions merge without silently discarding either allergy selection',()=>{
 const {mergeDietaryEntries,readDiet}=load('lib/dietary-safety.ts');
 const combined=mergeDietaryEntries(settings(['Milk']),settings(['Sesame']));
 assert.deepEqual(readDiet(combined).settings.allergies,['Milk','Sesame']);
 assert.ok(candidate.candidateOutputIssues({ingredients:[{name:'Tahini'}]},{diet:combined}).length);
});

test('weekly route validates desserts, preserves descriptions and never exceeds existing provider bounds',async()=>{
 process.env.OPENAI_API_KEY='mock-provider-only';let calls=0;
 let answer={meals:Array.from({length:7},(_,i)=>({...meal('Rice dinner '+i,[{name:'Rice',amount:'1 cup',price:1}]),day:'Day '+i,notes:'A practical meal'})),breakfasts:[],lunches:[],estimated_total_cost:7,budget_summary:'Test',upgrade_available:false,desserts:[]};
 class Provider{chat={completions:{create:async()=>{calls++;return {choices:[{message:{content:JSON.stringify(answer)}}]};}}};}
 const server=loader({'openai':Provider,'./beta-pilot-ai':{pilotAIBudget:async()=>null}})('lib/meal-generation.ts');
 const input={budget:50,householdSize:2,diet:'No preference',combinedPantryItems:'Rice',availableEquipment:['Stovetop']};
 let r=await server.generateMealPlan(input,'free');assert.equal(r.status,200);let result=await r.json();assert.match(result.meals[0].description,/Tender/);assert.equal(result.meals[0].dietaryRestrictions,input.diet);assert.equal(calls,1);
 answer={...answer,breakfasts:answer.meals.slice(0,3),lunches:answer.meals.slice(0,3)};
 r=await server.generateMealPlan({...input,includeBreakfast:true,includeLunch:true},'free');assert.equal(r.status,200);result=await r.json();assert.equal(result.meals.length,13);assert.ok(result.meals.every(m=>m.description&&m.dietaryRestrictions===input.diet));
 calls=0;answer={...answer,desserts:[{title:'Carrot dessert',description:'Sweet carrot dessert with a tender crumb.',ingredients:[{name:'Carrots',amount:'1',price:1}]}]};r=await server.generateMealPlan({...input,avoidIngredients:'carrots',includeDessert:true},'free');assert.ok(r.status>=400);assert.ok(calls<=3);
});

test('ham does not match shawarma, and invalid zero-price output receives bounded schema correction',async()=>{
 const {equipmentRequirementText}=load('lib/meal-quality.ts');
 assert.doesNotMatch(equipmentRequirementText('The sauce requires no blender. Nothing is blended or pureed.'),/blender|blended|pureed/);
 assert.match(equipmentRequirementText('No blender is needed. Use a blender to puree the tomatoes.'),/blender/);
 const {foodTermMatches}=load('lib/meal-quality.ts');assert.equal(foodTermMatches('Chickpea shawarma','ham'),false);assert.equal(foodTermMatches('Ham and cheese','ham'),true);
 process.env.OPENAI_API_KEY='mock-only';let calls=0;
 const answer={meals:Array.from({length:7},(_,i)=>({...meal('Rice '+i,[{name:'Rice',amount:'1 cup',price:1}]),day:'Day '+i})),breakfasts:[],lunches:[],estimated_total_cost:7,budget_summary:'Test',upgrade_available:false,desserts:[]};
 class Provider{chat={completions:{create:async()=>{calls++;const value=structuredClone(answer);if(calls===1)value.meals[0].ingredients[0].price=0;return {choices:[{message:{content:JSON.stringify(value)}}]};}}};}
 const fn=loader({'openai':Provider,'./beta-pilot-ai':{pilotAIBudget:async()=>null}})('lib/meal-generation.ts').generateMealPlan;
 const r=await fn({budget:50,householdSize:2,diet:'No preference',combinedPantryItems:'Rice'},'free');assert.equal(r.status,200);assert.equal(calls,2);
});

test('candidate revalidates cached completed results instead of returning old incompatible recommendations',async()=>{
 const flag=process.env.MEALCADDIE_DIETARY_CANDIDATE,env=process.env.VERCEL_ENV;
 try{process.env.MEALCADDIE_DIETARY_CANDIDATE='true';process.env.VERCEL_ENV='preview';
 const job={status:'completed',input:{diet:settings(['Sesame'])},result:{meals:[{ingredients:[{name:'Tahini'}]}]}};
 const route=loader({'@/lib/product-access':{requireProductAccess:async()=>null},'@/lib/generation-identity':{generationIdentity:async()=>({owner:'test'})},'@/lib/generation-jobs':{readGenerationJob:async()=>job,publicGenerationJob:j=>j}})('app/api/generate-list/route.ts');
 const r=await route.GET(new Request('http://local.test/api/generate-list'));assert.equal(r.status,422);assert.equal((await r.json()).code,'DIETARY_OUTPUT_REJECTED');
 }finally{if(flag===undefined)delete process.env.MEALCADDIE_DIETARY_CANDIDATE;else process.env.MEALCADDIE_DIETARY_CANDIDATE=flag;if(env===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=env;}
});

test('direct replacement API cannot bypass pantry-only availability',async()=>{
 process.env.OPENAI_API_KEY='mock-only';let calls=0;
 class Provider{chat={completions:{create:async()=>{calls++;return {choices:[{message:{content:JSON.stringify({title:'Milk porridge',description:'A warm creamy porridge with tender rice.',prepTime:20,ingredients:['Milk']})}}]};}}};}
 const route=loader({'openai':Provider,'@/lib/product-access':{requireProductAccess:async()=>null},'@/lib/legal-agreements':{requireAgreements:async()=>null},'@/lib/server-membership':{getRequestMembership:async()=>({plan:'free'})},'@/lib/beta-pilot-ai':{pilotAIBudget:async()=>null}})('app/api/replace-meal/route.ts');
 const r=await route.POST(new Request('http://local.test',{method:'POST',body:JSON.stringify({budget:50,householdSize:2,diet:'No preference',combinedPantryItems:'Rice',mealSourceMode:'pantry-only',rejectedMealTitle:'Rice plate',availableEquipment:['Stovetop']})}));assert.ok(r.status>=400);assert.ok(calls<=2);
});

test('original saved allergy still blocks regeneration when current controls omit it',async()=>{
 process.env.OPENAI_API_KEY='mock-only';let calls=0;
 class Provider{chat={completions:{create:async()=>{calls++;throw Error('must not call');}}};}
 const route=loader({'openai':Provider,'@/lib/product-access':{requireProductAccess:async()=>null},'@/lib/legal-agreements':{requireAgreements:async()=>null},'@/lib/server-membership':{getRequestMembership:async()=>({plan:'free'})},'@/lib/beta-pilot-ai':{pilotAIBudget:async()=>null}})('app/api/get-recipe/route.ts');
 const r=await route.POST(new Request('http://local.test',{method:'POST',body:JSON.stringify({mealTitle:'Rice',diet:'No preference',originalDietaryRestrictions:settings(['Milk'])})}));assert.equal(r.status,422);assert.equal(calls,0);
});
