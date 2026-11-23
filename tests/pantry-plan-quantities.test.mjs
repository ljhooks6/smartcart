import test from 'node:test';
import assert from 'node:assert/strict';
import {loader,withEnv} from './helpers/load-ts.mjs';

const inventory=[{name:'Rice',quantity:0.5,unit:'cup',status:'owned'},{name:'Scallions',quantity:2,unit:'each',status:'owned'}];
const input={budget:60,diet:'No preference',householdSize:2,combinedPantryItems:'Rice, Scallions',mealSourceMode:'pantry-only',availableEquipment:['Stovetop'],prepTime:'Under 30 mins',pantryInventory:inventory};
const meal={day:'Day 1',name:'Scallion Rice Skillet',servings:2,description:'Tender rice with green onion.',prep_time_minutes:20,ingredients:[{name:'Rice',amount:'1 cup',price:0},{name:'Green onion',amount:'1',price:0}]};
async function generate(meals=[meal],extra={},desserts=[]){
 let calls=0;const prompts=[];
 class Provider{chat={completions:{create:async({messages})=>{calls++;prompts.push(messages.map(m=>m.content).join('\n'));return {choices:[{message:{content:JSON.stringify({meals,desserts,estimated_total_cost:0,budget_summary:'Synthetic only',upgrade_available:false})}}]};}}};}
 return withEnv({OPENAI_API_KEY:'mock-only'},async()=>{
  const api=loader({openai:Provider,'./beta-pilot-ai':{pilotAIBudget:async()=>null}})('lib/meal-generation.ts');
  const r=await api.generateMealPlan({...input,...extra},'free');return {status:r.status,body:await r.json(),calls,prompts};
 });
}
test('generation request retains the measured pantry snapshot',()=>{
 const {generationRequestSchema}=loader()('lib/generation-request.ts');
 assert.deepEqual(generationRequestSchema.parse(input).pantryInventory,inventory);
});
test('known insufficient stock cannot produce an accepted pantry-only meal',async()=>{
 const r=await generate();assert.equal(r.status,422);assert.equal(r.body.code,'PANTRY_QUANTITIES_UNSATISFIED');
});

test('unknown quantities and package sizes fail before any provider call',async()=>{
 for(const pantryInventory of [undefined,[],[{name:'Rice',status:'stocked'}],[{name:'Rice',quantity:1,unit:'bag',status:'owned'}],[{name:'Rice',quantity:0,unit:'cup',status:'owned'}]]){
  const r=await generate([meal],{pantryInventory});assert.equal(r.status,422);assert.equal(r.calls,0);assert.equal(r.body.code,'PANTRY_QUANTITIES_REQUIRED');
 }
});
test('seven, limited and overlapping plans fit a single measured stock ledger',async()=>{
 const titles=['Scallion Rice Soup','Rice Patties','Scallion Rice Skillet','Rice Salad','Steamed Rice','Rice Porridge','Baked Rice'];
 const meals=titles.map((name,i)=>({...meal,name,day:'Day '+(i+1)}));
 for(const [cups,count] of [[7,7],[3,3],[1,1]]){
  const r=await generate(meals,{availableEquipment:['Stovetop','Oven'],pantryInventory:[{name:'Rice',quantity:cups,unit:'cup',status:'owned'},{name:'Scallions',quantity:10,unit:'each',status:'owned'}]});
  assert.equal(r.status,200);assert.equal(r.body.meals.length,count);assert.equal(r.calls,1);assert.deepEqual(r.body.restock_items,[]);assert.equal(r.body.estimated_total_cost,0);
  assert.equal(r.body.meals.reduce((n,m)=>n+Number.parseFloat(m.ingredients[0].amount),0),count);
 }
});
test('compatible units convert, unknown density and incomplete amounts do not',async()=>{
 const baseInventory=[{name:'Rice',quantity:8,unit:'tbsp',status:'owned'},{name:'Scallions',quantity:2,unit:'each',status:'owned'}];
 const half={...meal,ingredients:[{name:'Rice',amount:'1/2 cup',price:0},{name:'Scallions',amount:'1',price:0}]};
 assert.equal((await generate([half],{pantryInventory:baseInventory})).status,200);
 for(const amount of ['1 lb','to taste','1 cup + 1 cup','0 cups','1 bag'])assert.equal((await generate([{...meal,ingredients:[{name:'Rice',amount,price:0}]}],{pantryInventory:baseInventory})).status,422,amount);
});
test('failed trial deductions roll back, desserts share stock, and inputs are not mutated',()=>{
 const {fitPantryPlan}=loader()('lib/pantry-plan-quantities.ts');
 const enough={...input,pantryInventory:[{name:'Rice',quantity:1,unit:'cup',status:'owned'},{name:'Scallions',quantity:1,unit:'each',status:'owned'}]};
 const before=JSON.stringify(enough);
 const bad={...meal,ingredients:[...meal.ingredients,{name:'Unlisted sauce',amount:'1 cup',price:0}]};
 const review=fitPantryPlan([bad,meal],[{ingredients:[{name:'Rice',amount:'1 cup'}]}],enough);
 assert.equal(review.meals.length,1);assert.equal(review.desserts.length,0);assert.equal(review.omitted.length,2);assert.equal(JSON.stringify(enough),before);
});
test('explicit servings must match the household and ordinary planning is unaffected',async()=>{
 for(const size of [1,2,4,6]){
  const sized={...meal,servings:size,ingredients:[{name:'Rice',amount:size+' cups',price:0},{name:'Scallions',amount:'1',price:0}]};
  const r=await generate([sized],{householdSize:size,pantryInventory:[{name:'Rice',quantity:size,unit:'cup',status:'owned'},{name:'Scallions',quantity:1,unit:'each',status:'owned'}]});
  assert.equal(r.status,200);assert.equal(r.body.meals[0].servings,size);
 }
 assert.equal((await generate([{...meal,servings:4}],{householdSize:2})).status,422);
 const {pantryQuantityProblem}=loader()('lib/pantry-plan-quantities.ts');assert.equal(pantryQuantityProblem({mealSourceMode:'pantry-and-store'}),null);
});
test('unknown ingredients are omitted rather than treated as enough; restrictions still win',async()=>{
 const pantryInventory=[{name:'Rice',quantity:1,unit:'cup',status:'owned'},{name:'Scallions',quantity:2,unit:'each',status:'owned'},{name:'Milk',status:'stocked'}];
 const r=await generate([meal,{...meal,name:'Milk Rice',ingredients:[{name:'Milk',amount:'1 cup',price:0}]}],{combinedPantryItems:'Rice, Scallions, Milk',pantryInventory});
 assert.equal(r.status,200);assert.equal(r.body.meals.length,1);assert.match(r.body.planning_notice,/omitted/);
 assert.ok(!r.prompts[0].includes('Pantry Items: Rice, Scallions, Milk'));
 const restricted=await generate([meal],{diet:'Milk allergy',pantryInventory:[]});assert.equal(restricted.status,422);assert.equal(restricted.body.code,'ALLERGY_GENERATION_RESTRICTED');assert.equal(restricted.calls,0);
});

export {input,meal,generate};
