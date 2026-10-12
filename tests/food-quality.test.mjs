import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
const require=createRequire(import.meta.url), root=path.resolve(import.meta.dirname,'..');
process.env.OPENAI_API_KEY ||= 'local-mock-only';
function fixture({plan='free',invalid=false,outage=false,responses=[]}={}) {
 const calls=[],cache=new Map();
 class OpenAI { chat={completions:{create:async options=>{calls.push(structuredClone(options)); const content=responses[Math.min(calls.length-1,responses.length-1)]; if(!content) throw Error('mock provider stop');return {choices:[{message:{content:JSON.stringify(content)}}]};}}}; }
 const admin={auth:{getUser:async()=>{if(outage)throw Error('outage');return {data:{user:invalid?null:{id:'verified-owner'}},error:invalid?{status:401}:null};}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{plan},error:null})})})})};
 function load(file) {
  if(cache.has(file))return cache.get(file);const module={exports:{}};
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
  const resolve=name=>name==='openai'?OpenAI:name==='next/server'?{NextResponse:{json:(body,init)=>Response.json(body,init)}}:name.endsWith('supabase-admin')?{getSupabaseAdminClient:()=>admin}:name.startsWith('@/')||name.startsWith('.')?load((name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(file),name))+'.ts'):require(name);
  new Function('require','module','exports',code)(resolve,module,module.exports);cache.set(file,module.exports);return module.exports;
 }
 return {calls,load,post:async(endpoint,input,token)=>load(path.join(root,'app/api',endpoint,'route.ts')).POST(new Request('http://test.local',{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(input)}))};
}
const meal={mealTitle:'Chicken dinner',ingredients:[{name:'Chicken breast',amount:'1 lb'}],availableEquipment:['Stovetop']};
const recipe={title:'Chicken dinner',prep_time_minutes:20,ingredients:['1 lb Chicken breast'],steps:['Cut chicken breast.','Cook in a skillet.','Check the center with a thermometer for 165°F.']};
const dessertInput={rejectedDessertTitle:'Cookies',budget:10,diet:'Vegan, nut-free',combinedPantryItems:'Bananas, Rolled oats',mealSourceMode:'pantry-only',availableEquipment:['Microwave']};
const dessert={title:'Banana oat pudding',description:'Microwave a banana and oats until hot.',ingredients:[{name:'Bananas',amount:'2',price:1},{name:'Rolled oats',amount:'1/2 cup',price:0.5}]};
test('recipes select only verified server membership, ignore body quality claims, and use supported settings',async()=>{
 for(const [token,plan,model] of [[undefined,'plus','gpt-6-luna'],['valid','free','gpt-6-luna'],['valid','plus','gpt-6.1-sol']]){
  const f=fixture({plan,responses:[recipe]});const r=await f.post('get-recipe',{...meal,generationQuality:'plus',plan:'plus',userId:'forged'},token);
  assert.equal(r.status,200);assert.equal(f.calls[0].model,model);assert.equal(f.calls[0].reasoning_effort,'low');assert.equal('temperature' in f.calls[0],false);
 }
});
test('both food endpoints reject invalid credentials and auth outages before AI',async()=>{
 for(const endpoint of ['get-recipe','replace-dessert'])for(const [options,status] of [[{invalid:true},401],[{outage:true},503]]){
  const f=fixture(options);assert.equal((await f.post(endpoint,endpoint==='get-recipe'?meal:dessertInput,'bad')).status,status);assert.equal(f.calls.length,0);
 }
});
test('poultry and unplanned salt failures get one correction; only corrected recipe returns',async()=>{
 const f=fixture({responses:[{...recipe,steps:['Cook chicken.','Use salted water.','Serve.']},recipe]});const r=await f.post('get-recipe',meal);
 assert.equal(r.status,200);assert.deepEqual((await r.json()).steps,recipe.steps);assert.equal(f.calls.length,2);assert.match(f.calls[1].messages.at(-1).content,/Unplanned ingredient.*salt/);assert.match(f.calls[1].messages.at(-1).content,/thermometer/);
});
test('incompatible saved ingredients are rejected before spending on AI',async()=>{
 const f=fixture({responses:[recipe]});const r=await f.post('get-recipe',{...meal,diet:'Vegan'});assert.equal(r.status,422);assert.equal(f.calls.length,0);
});
test('rejected recipe never overwrites saved ingredients or leaks provider output',async()=>{
 const f=fixture({responses:[{...recipe,ingredients:['2 lb Chicken breast'],steps:['Use oven.','Add garlic.','Serve.']}]});const r=await f.post('get-recipe',meal);
 assert.equal(r.status,502);assert.equal(f.calls.length,2);assert.equal('ingredients' in await r.json(),false);
});
test('zero pantry prices and nut violations are corrected, treats use Luna for Plus too',async()=>{
 const f=fixture({plan:'plus',responses:[{...dessert,ingredients:[{name:'Almond milk',amount:'1 cup',price:0}]},dessert]});const r=await f.post('replace-dessert',dessertInput,'valid');
 assert.equal(r.status,200);assert.equal(f.calls.length,2);assert.equal(f.calls[0].model,'gpt-6-luna');assert.match(f.calls[0].messages[0].content,/NOT additional shopping cost/);assert.deepEqual((await r.json()).ingredients,dessert.ingredients);
});
test('pantry additions, forbidden equipment and budget overspend cannot be returned',async()=>{
 for(const bad of [{...dessert,ingredients:[{name:'Chia seeds',amount:'1 cup',price:1}]},{...dessert,description:'Bake in an oven.'},{...dessert,ingredients:[{name:'Bananas',amount:'2',price:11}]}]){
  const f=fixture({responses:[bad]});const r=await f.post('replace-dessert',dessertInput);assert.equal(r.status,502);assert.equal(f.calls.length,2);
 }
});
test('malformed preferences and nonpositive budget fail before AI',async()=>{
 for(const body of [{...dessertInput,budget:0},{...dessertInput,availableEquipment:'Oven'},{...dessertInput,householdSize:-2}]){const f=fixture();assert.equal((await f.post('replace-dessert',body)).status,400);assert.equal(f.calls.length,0);}
});
test('constraint checks preserve plant-based and gluten-free qualifiers while detecting singular nuts',()=>{
 const f=fixture(), {ingredientViolations,pantryViolations,recipeViolations}=f.load(path.join(root,'lib/ai-food-constraints.ts'));
 assert.deepEqual(ingredientViolations(['Oat milk','Vegan butter','Certified gluten-free oats'],{diet:'Vegan, gluten-free, nut-free'}),[]);
 assert.ok(ingredientViolations(['Almond milk'],{diet:'Tree-nut-free'}).length);
 assert.deepEqual(ingredientViolations(['Oat milk, peanut- and tree-nut-free','Oat milk certified free of peanuts and tree nuts'],{diet:'Vegan, nut-free',avoidIngredients:'peanuts, tree nuts'}),[]);
 assert.ok(ingredientViolations(['Peanut-free almond milk'],{diet:'Nut-free'}).length);
 assert.ok(ingredientViolations(['Whole milk'],{avoidIngredients:'dairy'}).length);
 assert.deepEqual(recipeViolations(recipe,meal.ingredients,{availableEquipment:['Stovetop']}),[]);
 assert.deepEqual(recipeViolations({...recipe,steps:['Cut chicken.','Cook chicken.','Check 74°C with a thermometer.']},meal.ingredients,{}),[]);
 assert.ok(ingredientViolations(['Rolled oats'],{diet:'Gluten-free'}).length);
 assert.deepEqual(pantryViolations(['Bananas','Rolled oats','Water'],'Bananas, Rolled oats'),[]);
 assert.ok(pantryViolations(['Almond milk'],'Whole milk').length);
 assert.ok(recipeViolations({...recipe,steps:['Cook with salt.','Cook chicken.','Serve.']},meal.ingredients,{}).length);
});
test('declared allergies block saved recipe conflicts before AI and independently recheck regenerated substitutions',async()=>{
 const diet='\nMealCaddie dietary settings v1: '+JSON.stringify({allergies:['Sesame'],preferences:[],customAllergies:'',intolerances:'',medical:''});
 const blocked=fixture({responses:[recipe]});assert.equal((await blocked.post('get-recipe',{...meal,diet,ingredients:[{name:'Tahini',amount:'1 cup'}]})).status,422);assert.equal(blocked.calls.length,0);
 const unsafe={...recipe,ingredients:['Rice'],steps:['Cook rice.','Substitute tahini for oil.','Serve.']},correct={...recipe,ingredients:['Rice'],steps:['Rinse rice.','Boil rice in water.','Serve rice.']};
 const f=fixture({responses:[unsafe,correct]});const response=await f.post('get-recipe',{mealTitle:'Rice',diet});assert.equal(response.status,200);assert.equal(f.calls.length,2);assert.deepEqual((await response.json()).ingredients,['Rice']);
 const rejected=fixture({responses:[unsafe]});assert.equal((await rejected.post('get-recipe',{mealTitle:'Rice',diet})).status,502);assert.equal(rejected.calls.length,2);
});
test('shopping consolidation rejects a generated known allergen and lost dietary qualifiers',async()=>{
 const diet='\nMealCaddie dietary settings v1: '+JSON.stringify({allergies:['Milk'],preferences:[],customAllergies:'',intolerances:'',medical:''});
 for(const output of [[{name:'Milk',price:1}],[{name:'Bread',price:1}]]){const f=fixture({responses:[output]});const response=await f.post('consolidate-ingredients',{ingredients:['gluten-free oat bread'],diet});assert.equal(response.status,422);assert.equal(f.calls.length,1);}
});
