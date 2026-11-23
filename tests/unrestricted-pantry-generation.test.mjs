import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {loader,withEnv} from './helpers/load-ts.mjs';

const empty={allergies:[],preferences:[],customAllergies:'',intolerances:'',medical:''};
const base={budget:60,householdSize:2,mealSourceMode:'pantry-only',combinedPantryItems:'Rice, Scallions',pantryInventory:[{name:'Rice',quantity:1,unit:'cup',status:'owned'},{name:'Scallions',quantity:2,unit:'each',status:'owned'}],availableEquipment:['Stovetop'],prepTime:'Under 30 mins'};
const clientSource=readFileSync('components/smart-cart-app.fixed.tsx','utf8');
// Execute the actual submitPlan dietary expression, not a reconstructed payload.
const dietExpression=clientSource.slice(clientSource.indexOf('async function submitPlan(')).match(/diet: ([^\r\n]+),/)[1];
function clientDiet(value){
 const api=clientSource.includes('dietForGeneration(')?loader()('lib/dietary-request-value.ts'):{};
 return new Function('formState','safeTrim','dietForGeneration',`return ${dietExpression};`)({diet:value},v=>typeof v==='string'?v.trim():'',api.dietForGeneration);
}
function route(){
 const reservations=[];
 const load=loader({'@/lib/generation-identity':{generationIdentity:async()=>({owner:'user:synthetic',quota:'user:synthetic',userId:'synthetic',plan:'free'})},'@/lib/generation-jobs':{reserveGenerationJob:async(identity,key,input)=>{reservations.push({identity,key,input});return {job:{id:'11111111-1111-4111-8111-111111111111',status:'queued',input}};},publicGenerationJob:j=>j},'@/lib/generation-dispatch':{dispatchGenerationJob:async()=>{}}});
 return {POST:load('app/api/generate-list/route.ts').POST,reservations};
}
const request=diet=>new Request('http://localhost:3032/api/generate-list',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3032','Idempotency-Key':'11111111-1111-4111-8111-111111111111'},body:JSON.stringify({...base,diet})});

test('clearing the visible original entry and selections submits a valid unrestricted envelope',async()=>{
 const {writeDiet}=loader()('lib/dietary-safety.ts');
 const value=writeDiet('',empty),r=route();
 const response=await r.POST(request(clientDiet(value)));
 assert.equal(response.status,202,JSON.stringify(await response.json()));
 assert.equal(r.reservations[0].input.diet,value);
});

test('fresh planning state does not select Vegetarian on the user’s behalf',()=>{
 const file=ts.createSourceFile('app.tsx',clientSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let diet;
 function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='initialFormState')diet=node.initializer.properties.find(p=>p.name.getText(file)==='diet').initializer.getText(file);ts.forEachChild(node,visit);}
 visit(file);assert.equal(JSON.parse(diet),'No preference');
});

test('diet transport preserves meaningful and malformed values byte for byte in every request path',()=>{
 const load=loader(),{writeDiet}=load('lib/dietary-safety.ts'),{dietForGeneration}=load('lib/dietary-request-value.ts');
 for(const text of ['Vegetarian','  Vegan  ','Milk allergy','No preference',writeDiet('',empty),writeDiet('',{...empty,allergies:['Milk']}),'\nMealCaddie dietary settings v1: {bad}'])assert.equal(dietForGeneration(text),text);
 for(const text of ['',' \t\n'])assert.equal(dietForGeneration(text),'No preference');
 assert.doesNotMatch(clientSource,/safeTrim\(formState\.diet\)/);
 assert.equal((clientSource.match(/diet: dietForGeneration\(formState\.diet\)/g)||[]).length,3);
});

test('cleared ordinary selections, explicit preferences, and unrestricted legacy values pass the real route',async()=>{
 const load=loader(),{writeDiet,readDiet}=load('lib/dietary-safety.ts');
 const selected=writeDiet('',{...empty,preferences:['Vegetarian']});
 const cleared=writeDiet(readDiet(selected).legacy,{...readDiet(selected).settings,preferences:[]});
 for(const value of ['', 'No preference','Vegetarian',writeDiet('No preference',empty),selected,cleared]){
  const r=route(),diet=clientDiet(value),response=await r.POST(request(diet));
  assert.equal(response.status,202,value);assert.equal(r.reservations[0].input.diet,diet);
 }
});

test('actual restrictions, stale legacy text, unknown envelope fields and malformed serialization stop before quota or AI',async()=>{
 const load=loader(),{writeDiet,readDiet}=load('lib/dietary-safety.ts');
 const legacy=writeDiet('Milk allergy',{...empty,preferences:['Vegetarian']});
 const clearedPreferences=writeDiet(readDiet(legacy).legacy,{...readDiet(legacy).settings,preferences:[]});
 const values=[legacy,clearedPreferences,writeDiet('',{...empty,allergies:['Milk']}),writeDiet('',{...empty,customAllergies:'Kiwi'}),writeDiet('',{...empty,intolerances:'Lactose'}),writeDiet('',{...empty,medical:'Kidney diet'}),writeDiet('',{...empty,preferences:['Gluten-free']}),writeDiet('',{...empty,unknown:'Milk allergy'}),writeDiet('',empty).trim(),'\nMealCaddie dietary settings v1: {bad}','Unclear custom restriction','Vegetarian, Milk allergy'];
 for(const value of values){
  const r=route(),response=await r.POST(request(clientDiet(value)));
  assert.equal(response.status,422,value);assert.equal((await response.json()).code,'ALLERGY_GENERATION_RESTRICTED');assert.equal(r.reservations.length,0);
 }
 const summary=load('lib/dietary-summary.ts');
 for(const value of [writeDiet('',{...empty,unknown:'Milk allergy'}),writeDiet('',empty).trim(),'\nMealCaddie dietary settings v1: {bad}'])assert.ok(summary.dietarySummary(value).warning);
 assert.match(summary.dietarySummary(clearedPreferences).rows.join(' '),/Milk allergy/);
});

function restorePlanning({owner='synthetic',metadata={},stored=null,current=null}={}){
 const file=ts.createSourceFile('app.tsx',clientSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let callback,initial;
 function visit(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='initialFormState')initial=node.initializer.getText(file);
  if(ts.isCallExpression(node)&&node.expression.getText(file)==='useEffect'&&node.arguments[0]?.getText(file).includes('const stored = loadStoredJson<{ owner: string; form: Partial<FormState>'))callback=node.arguments[0].getText(file);
  ts.forEachChild(node,visit);
 }
 visit(file);assert.ok(callback,'actual owner-scoped restoration effect found');
 const api=loader()('lib/account-experience.ts');
 const code=ts.transpileModule(`const restore=${callback};restore();`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 let result=current;
 new Function('hasResolvedAuthSession','loadStoredJson','planningKey','planOwner','user','readHousehold','householdPlanDefaults','initialFormState','setPlanning','sessionStorage','setActiveMobileTab',code)(true,()=>structuredClone(stored),'mealcaddie-planning-v1:'+owner,owner,{id:owner,user_metadata:metadata},api.readHousehold,api.householdPlanDefaults,new Function(`return ${initial}`)(),fn=>{result=fn(result);},{getItem:()=>null},()=>{});
 return result;
}

test('fresh/returning Free and Plus accounts restore exact owner drafts and household defaults',()=>{
 const load=loader(),{writeDiet}=load('lib/dietary-safety.ts');
 for(const tier of ['free','plus']){
  const owner='synthetic-'+tier;
  assert.equal(restorePlanning({owner}).form.diet,'No preference');
  for(const [diet,restrictions] of [['No preference',''],['Vegetarian',''],['No preference','Milk allergy']]){
   const metadata={mealcaddie_household_v1:{complete:true,diet,restrictions}};
   const restored=restorePlanning({owner,metadata});
   const expected=load('lib/account-experience.ts').householdPlanDefaults(load('lib/account-experience.ts').readHousehold(metadata)).diet;
   assert.equal(restored.form.diet,expected);
  }
  for(const diet of ['', 'Vegetarian',writeDiet('',empty),writeDiet('',{...empty,allergies:['Sesame']}),'\nMealCaddie dietary settings v1: {bad}']){
   const stored={owner,form:{diet,budget:'80'},step:5};const original=JSON.stringify(stored);
   const restored=restorePlanning({owner,stored});
   assert.equal(restored.form.diet,diet);assert.equal(restored.step,5);assert.equal(JSON.stringify(stored),original);
  }
  assert.equal(restorePlanning({owner,stored:{owner:'different-owner',form:{diet:'Milk allergy'},step:5}}).form.diet,'No preference');
 }
});

test('unrestricted serialized Pantry Only completes generation with one mocked provider call',async()=>withEnv({OPENAI_API_KEY:'mock-only'},async()=>{
 const load=loader(),{writeDiet}=load('lib/dietary-safety.ts');let calls=0;
 class Provider{chat={completions:{create:async()=>{calls++;return {choices:[{message:{content:JSON.stringify({meals:[{day:'Day 1',name:'Scallion Rice Skillet',servings:2,description:'Tender rice with green onion.',prep_time_minutes:20,ingredients:[{name:'Rice',amount:'1 cup',price:0},{name:'Scallions',amount:'1',price:0}]}],desserts:[],estimated_total_cost:0,budget_summary:'Synthetic pantry options',upgrade_available:false})}}]};}}};}
 const generate=loader({openai:Provider,'./beta-pilot-ai':{pilotAIBudget:async()=>null}})('lib/meal-generation.ts').generateMealPlan;
 const diet=clientDiet(writeDiet('',empty));
 const response=await generate({...base,diet},'free');
 assert.equal(response.status,200);assert.equal(calls,1);const body=await response.json();assert.equal(body.meals.length,1);assert.equal(body.meals[0].dietaryRestrictions,diet);
}));
