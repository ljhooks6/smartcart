import test from 'node:test';
import assert from 'node:assert/strict';
import {loader} from './helpers/load-local-ts.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const load=loader(),{writeDiet}=load('lib/dietary-safety.ts');
const {reviewedRecipes,expandRecipeParts}=load('lib/allergy-aware-recipes.ts');
const {profileById}=load('lib/allergy-aware-catalog.ts');
const {createAllergyAwarePlan}=load('lib/allergy-aware-planner.ts');
const {assertPilotScope}=load('lib/allergy-library-local.ts');
const sources=['Milk','Eggs','Peanuts','Sesame'];
const diet=(allergies=sources,preferences=[],extra={})=>writeDiet('No preference',{allergies,preferences,customAllergies:'',intolerances:'',medical:'',...extra});
const base={diet:diet(),budget:1000,householdSize:2,count:7,includeDessert:true,availableEquipment:['Oven','Stovetop'],maxMinutes:60};

test('ten-recipe calibration batch matches exact engineering revisions, with cooking and professional decisions unclaimed',()=>{
 const batch=JSON.parse(readFileSync('docs/allergy-review-packet/calibration-batch.json','utf8'));
 const {canonical}=load('lib/allergy-library-provenance.ts');assert.equal(batch.recipes.length,10);assert.equal(new Set(batch.recipes.map(r=>r.id)).size,10);
 for(const r of batch.recipes){const spec=reviewedRecipes.find(s=>s.id===r.id);assert.equal(r.contentSHA256,createHash('sha256').update(canonical(spec)).digest('hex'));assert.equal(r.professionalReview,'NOT REVIEWED');assert.equal(r.practicalCooking,'NOT TESTED');assert.ok(r.calibrationQuestions);}
 const matrix=readFileSync('docs/allergy-review-packet/physical-cooking-tests.md','utf8');for(const r of reviewedRecipes)assert.ok(matrix.includes(`| ${r.id} / ${r.revision} |`));
});
test('48 authored engineering candidates: 36 dinners, 12 desserts, explicit components and equipment',()=>{
 assert.equal(reviewedRecipes.length,48);assert.equal(reviewedRecipes.filter(r=>r.kind==='dinner').length,36);assert.equal(reviewedRecipes.filter(r=>r.kind==='dessert').length,12);
 assert.equal(new Set(reviewedRecipes.map(r=>r.id)).size,48);
 assert.ok(new Set(reviewedRecipes.filter(r=>r.kind==='dinner').map(r=>r.family)).size>=28);
 for(const r of reviewedRecipes){assert.equal(r.reviewStatus,'engineering-candidate');assert.ok(r.requiredEquipment.length);assert.ok(r.steps.length>=3);for(const p of expandRecipeParts(r)){assert.ok(profileById(p.foodId));assert.ok(p.quantity>0);}}
});
for(let mask=1;mask<16;mask++)test(`five successive generations rotate families: four-source mask ${mask}`,()=>{
 const input={...base,diet:diet(sources.filter((_,i)=>mask&(1<<i)))};const history=[];
 for(let i=0;i<5;i++){
   const result=createAllergyAwarePlan(input,{seed:`job-${i}`,recentPlans:history.slice(-3).reverse()});assert.equal(result.ok,true);
   const plan=result.plan,dinners=plan.meals.filter(m=>m.kind==='dinner');assert.equal(dinners.length,7);
   assert.equal(new Set(dinners.map(m=>m.family)).size,7);
   const previous=new Set(history.slice(-3).flat().map(id=>reviewedRecipes.find(r=>r.id===id)).filter(r=>r?.kind==='dinner').map(r=>r.family));
   assert.equal(dinners.filter(r=>previous.has(r.family)).length,0);
   assert.deepEqual(createAllergyAwarePlan(input,{seed:`job-${i}`,recentPlans:history.slice(-3).reverse()}),result,'same job is deterministic');
   history.push(plan.recipeIds);
 }
});
test('rejected recipes suppress the entire family without permanently banning a dish',()=>{
 const rejected=['turkey-cabbage-skillet'];const next=createAllergyAwarePlan(base,{seed:'rejected',rejected});assert.equal(next.ok,true);
 assert.ok(next.plan.meals.every(m=>m.family!=='ground-meat-vegetable-skillet'));
 const requested=createAllergyAwarePlan({...base,count:1,includeDessert:false,selectedRecipeIds:['turkey-cabbage-skillet']},{seed:'requested',rejected});
 assert.equal(requested.ok,true);assert.deepEqual(requested.plan.rotation.rejectedReused,['turkey-cabbage-skillet']);
});
for(const scenario of [
 {name:'vegan-budget',input:{...base,diet:diet(sources,['Vegan']),budget:35,maxMinutes:45}},
 {name:'vegetarian-stovetop',input:{...base,diet:diet(['Milk','Peanuts','Sesame'],['Vegetarian']),availableEquipment:['Stovetop'],maxMinutes:45,budget:45}},
 {name:'stovetop',input:{...base,availableEquipment:['Stovetop'],maxMinutes:45,budget:50}},
 {name:'tight-budget',input:{...base,budget:30,maxMinutes:60}},
])test(`five constrained generations: ${scenario.name}`,()=>{
 const history=[],unique=new Set();
 for(let i=0;i<5;i++){
  const r=createAllergyAwarePlan(scenario.input,{seed:`${scenario.name}-${i}`,recentPlans:history.slice(-3).reverse()});assert.equal(r.ok,true,JSON.stringify(r));
  assert.ok(r.plan.estimatedCost<=scenario.input.budget);for(const m of r.plan.meals){unique.add(m.id);const spec=reviewedRecipes.find(r=>r.id===m.id);assert.ok(spec.requiredEquipment.every(e=>scenario.input.availableEquipment.includes(e)));assert.ok(m.minutes<=scenario.input.maxMinutes);}
  if(r.plan.rotation.repeatedFamilies.length)assert.match(r.plan.rotation.message,/limited/);
  history.push(r.plan.recipeIds);
 }
 assert.ok(unique.size>8,'new generations use alternatives where feasible');
});
test('five pantry-only generations preserve exact quantities; shortage and large-batch limits fail closed',()=>{
 const initial=createAllergyAwarePlan(base);assert.equal(initial.ok,true);
 const pantry=initial.plan.groceries.map(l=>({name:l.name,quantity:l.quantity,unit:l.unit}));const history=[];
 for(let i=0;i<5;i++){
  const r=createAllergyAwarePlan({...base,pantry,mealSourceMode:'pantry-only'},{seed:`pantry-${i}`,recentPlans:history.slice(-3).reverse()});assert.equal(r.ok,true);assert.deepEqual(r.plan.groceries,[]);history.push(r.plan.recipeIds);
 }
 assert.equal(createAllergyAwarePlan({...base,pantry:[],mealSourceMode:'pantry-only'}).ok,false);
 assert.equal(createAllergyAwarePlan({...base,budget:22}).ok,false,'an infeasible seven-dinner budget is rejected, not relaxed');
 assert.equal(createAllergyAwarePlan({...base,householdSize:12,maxMinutes:25}).ok,false);
});
test('initial authenticated candidate scope rejects unsupported additions, old unclear entries and intolerances',()=>{
 for(const input of [{diet:diet(['Fish'])},{diet:diet(),originalDietaryRestrictions:diet(['Soy'])},{diet:diet(sources,[],{customAllergies:'kiwi'})},{diet:diet(sources,[],{intolerances:'lactose'})},{diet:diet(sources,[],{medical:'renal'})},{diet:'milk allergy'},{diet:diet([])}])assert.throws(()=>assertPilotScope(input),/only explicit/);
 assert.doesNotThrow(()=>assertPilotScope({diet:diet(sources,['Vegan'])}));
});
