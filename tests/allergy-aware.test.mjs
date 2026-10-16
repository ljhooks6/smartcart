import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loader,withEnv} from './helpers/load-ts.mjs';
import {base,dietary,planningCases,draftCases,sourceAllergens,pantryForStew} from '../evals/allergy-aware-cases.mjs';
const load=loader();
const catalog=load('lib/allergy-aware-catalog.ts');
const {buildAllergyPolicy,ingredientFindings,auditAllergyDraft}=load('lib/allergy-aware-policy.ts');
const recipes=load('lib/allergy-aware-recipes.ts');
const planner=load('lib/allergy-aware-planner.ts');

for(const c of planningCases)test('reviewed planning: '+c.id,()=>{
 const result=planner.createAllergyAwarePlan(c.input);assert.equal(result.ok,c.expected,JSON.stringify(result));
 if(result.ok){assert.equal(result.plan.meals.filter(m=>m.kind==='dinner').length,c.input.count);assert.ok(result.plan.estimatedCost<=c.input.budget);assert.ok(result.plan.meals.every(m=>m.minutes<=c.input.maxMinutes));assert.ok(result.plan.meals.every(m=>m.steps.length>=3));assert.equal(result.plan.status,'declared-ingredients-checked');assert.match(result.plan.notice,/not verified/);}
});
for(const c of draftCases)test('untrusted draft blocked: '+c.id,()=>{
 const r=auditAllergyDraft(c.draft,{diet:dietary(c.allergies)});assert.ok(r.findings.length,c.id);assert.equal(r.releaseEligible,false);
});
test('all nine source families and ingredient variants detect known conflicts',()=>{
 const cases={Milk:['whey protein','sodium caseinate','goat milk','sheep milk','non-animal casein','lactose-free milk'],Eggs:['duck eggs','quail eggs','ovalbumin','mayonnaise'],Fish:['bonito','anchovies','fish sauce','dashi'],'Crustacean shellfish':['prawns','krill','crayfish','belacan'],'Tree nuts':['cashews','filberts','marzipan','gianduja'],Peanuts:['groundnuts','arachis oil','peanut oil','goober peas'],Wheat:['semolina','durum','spelt','einkorn','soy sauce'],Soy:['tofu','edamame','tamari','soy lecithin','soybean oil'],Sesame:['tahini','tehina','gingelly oil','gomasio','Sesamum indicum']};
 for(const [a,foods] of Object.entries(cases))for(const food of foods)assert.ok(ingredientFindings(food,buildAllergyPolicy({diet:dietary([a])}),'test').some(f=>f.code==='SOURCE_CONFLICT'),a+': '+food);
});
test('milk source exclusion is not a lactose threshold or a newly invented allergy',()=>{
 const p=buildAllergyPolicy({diet:dietary([],{intolerances:'lactose'})});assert.deepEqual(p.allergies,[]);assert.deepEqual(p.excludedSources,['Milk']);assert.equal(p.intolerances[0].strategy,'exclude-milk-sources');
 assert.ok(buildAllergyPolicy({diet:dietary([],{intolerances:'histamine'})}).findings.length);
});
test('plain ingredient avoidance remains separate; ambiguous allergy language never downgrades to a preference',()=>{
 const p=buildAllergyPolicy({diet:dietary(),avoidIngredients:'no mushrooms'});assert.deepEqual(p.allergies,[]);assert.deepEqual(p.avoidedFoodIds,['mushroom']);
 for(const text of ['nut-free','shellfish allergy','dairy free','I react to sauces'])assert.ok(buildAllergyPolicy({diet:text}).findings.length);
 assert.ok(buildAllergyPolicy({diet:dietary(),avoidIngredients:'milk allergy'}).findings.length);
});
test('unknown fields, malformed originals and conflicting saved entries cannot be dropped during merge',()=>{
 const extra=dietary().replace('"medical":""','"medical":"","secret":"milk allergy"');
 assert.ok(buildAllergyPolicy({diet:dietary(),originalDietaryRestrictions:extra}).findings.length);
 assert.ok(buildAllergyPolicy({diet:dietary(),originalDietaryRestrictions:'not a readable medical entry'}).findings.length);
 const p=buildAllergyPolicy({diet:dietary(['Milk']),originalDietaryRestrictions:dietary(['Sesame'])});assert.deepEqual(p.excludedSources,['Milk','Sesame']);
});
test('catalog resolves quantities conservatively and never uses model IDs or negative label claims as authority',()=>{
 assert.equal(catalog.resolveFoodName('1 cup chopped carrots')?.id,'carrot');
 for(const name of ['chicken with sauce','broth','flour','chocolate','seasoning','natural flavors','Rice or tofu','milk-free spread','rice\u200b milk','canned chickpeas','brand-name rice mix'])assert.equal(catalog.resolveFoodName(name),undefined,name);
 assert.deepEqual(catalog.mentionedSources('Cocoa butter'),[]); // unknown formulation, not a milk-source assertion
 assert.ok(ingredientFindings('Cocoa butter',buildAllergyPolicy({diet:dietary(['Milk'])}),'test').some(f=>f.code==='COMPOSITION_UNKNOWN'));
});
test('all server-owned ingredients, components and steps are complete and exact; caller composition is not trusted',()=>{
 assert.equal(new Set(catalog.foodCatalog.map(f=>f.id)).size,catalog.foodCatalog.length);
 const aliases=catalog.foodCatalog.flatMap(f=>f.aliases.map(a=>catalog.normalizeFoodName(a)));assert.equal(new Set(aliases).size,aliases.length);
 for(const r of recipes.reviewedRecipes){const parts=recipes.expandRecipeParts(r);assert.ok(parts.length);assert.ok(parts.every(p=>p.quantity>0&&catalog.profileById(p.foodId)));assert.ok(r.steps.length>=3);}
 const denied=planner.createAllergyAwarePlan({...base,count:1,includeDessert:false,selectedRecipeIds:['forged-ai-recipe']});assert.equal(denied.ok,false);
 assert.equal(planner.createAllergyAwarePlan({...base,verified:true}).ok,false);
});
test('pantry quantities are enforced across the complete plan; conflicts are quarantined without deleting pantry data',()=>{
 const pantry=structuredClone(pantryForStew),copy=structuredClone(pantry);
 const r=planner.createAllergyAwarePlan({...base,count:1,includeDessert:false,mealSourceMode:'pantry-only',selectedRecipeIds:['chickpea-tomato-stew'],pantry});assert.equal(r.ok,true);assert.deepEqual(r.plan.groceries,[]);assert.deepEqual(pantry,copy);
 assert.equal(planner.createAllergyAwarePlan({...base,count:1,includeDessert:false,mealSourceMode:'pantry-only',selectedRecipeIds:['chickpea-tomato-stew'],pantry:pantry.map(p=>p.name==='Rice'?{...p,quantity:1}:p)}).ok,false);
 const mixed=planner.createAllergyAwarePlan({...base,count:1,includeDessert:false,pantry:[{name:'Milk',unit:'ml',quantity:300},{name:'Secret sauce',unit:'g',quantity:20}]});assert.equal(mixed.ok,true);assert.equal(mixed.plan.quarantinedPantry.length>=2,true);
});
test('saved reopening, recipe regeneration and replacements preserve original restrictions without rewriting saved content',()=>{
 const r=planner.createAllergyAwarePlan({...base,count:1,includeDessert:false,selectedRecipeIds:['salmon-green-beans']});assert.equal(r.ok,true);
 const saved=structuredClone(r.plan.snapshot),copy=structuredClone(saved);
 assert.equal(planner.reopenAllergyAwarePlan(saved,dietary(['Fish'])).ok,false);assert.deepEqual(saved,copy);
 const next=planner.replaceAllergyAwareRecipe(saved,dietary(),0,'chickpea-tomato-stew');assert.equal(next.ok,true);assert.ok(next.plan.policy.excludedSources.includes('Milk'));
 assert.equal(planner.replaceAllergyAwareRecipe(saved,dietary(['Eggs']),0,'egg-potato-skillet').ok,false);
 assert.equal(planner.reopenAllergyAwarePlan({...saved,catalogVersion:'old'},dietary()).ok,false);
 assert.equal(planner.reopenAllergyAwarePlan({meals:[{name:'Historical recipe'}]},dietary()).ok,false);
});
test('grocery transformations revalidate all foods, omissions, aliases, quantities, units and current+original restrictions',()=>{
 const r=planner.createAllergyAwarePlan({...base,count:1,includeDessert:false,selectedRecipeIds:['lemon-chicken']});assert.equal(r.ok,true);
 const list=r.plan.groceries.map(({name,quantity,unit})=>({name,quantity,unit}));
 assert.equal(planner.reviewAllergyGroceryList(list,r.plan.snapshot,dietary()).ok,true);
 for(const bad of [[...list,{name:'Milk',quantity:1,unit:'ml'}],list.slice(1),list.map((p,i)=>i? p:{...p,quantity:p.quantity+1}),list.map((p,i)=>i?p:{...p,name:'Bottled dressing'})])assert.equal(planner.reviewAllergyGroceryList(bad,r.plan.snapshot,dietary()).ok,false);
});
test('frozen specification regenerates exact ingredients, and every source combination has a seven-dinner candidate',()=>{
 for(let mask=1;mask<512;mask++){
  const allergies=sourceAllergens.filter((_,i)=>(mask&(1<<i))!==0);
  const r=planner.createAllergyAwarePlan({...base,diet:dietary(allergies)});assert.equal(r.ok,true,allergies.join(','));
  assert.ok(r.plan.meals.flatMap(m=>m.ingredients).every(i=>!catalog.profileById(i.foodId).sources.some(s=>allergies.includes(s))));
  const reopened=planner.reopenAllergyAwarePlan(r.plan.snapshot,dietary(allergies));assert.equal(reopened.ok,true);assert.deepEqual(reopened.plan.meals,r.plan.meals);
 }
});
test('neither the new local lab nor the old candidate can be enabled on Preview or production by a flag',async()=>{
 for(const env of ['production','preview'])await withEnv({NODE_ENV:'development',VERCEL_ENV:env,MEALCADDIE_ALLERGY_LAB:'true',MEALCADDIE_DIETARY_CANDIDATE:'true'},async()=>{assert.equal(planner.allergyLabEnabled(),false);if(env==='production')assert.equal(load('lib/dietary-candidate.ts').dietaryCandidateEnabled(),false);});
 await withEnv({NODE_ENV:'production',VERCEL_ENV:undefined,MEALCADDIE_ALLERGY_LAB:'true'},async()=>assert.equal(planner.allergyLabEnabled(),false));
 await withEnv({NODE_ENV:'development',VERCEL_ENV:undefined,MEALCADDIE_ALLERGY_LAB:'true'},async()=>assert.equal(planner.allergyLabEnabled(),true));
 const config=JSON.parse(readFileSync('vercel.json','utf8'));assert.equal(config.git.deploymentEnabled['feature/allergy-aware-candidate'],false);
});

test('local HTTP adapter denies hosted access before parsing and never authorizes account or provider operations',async()=>{
 const {POST}=load('app/api/labs/allergy-aware/route.ts');
 for(const env of ['production','preview'])await withEnv({NODE_ENV:'development',VERCEL_ENV:env,MEALCADDIE_ALLERGY_LAB:'true'},async()=>{
  const r=await POST(new Request('https://mealcaddie.app/api/labs/allergy-aware',{method:'POST',body:'not JSON'}));assert.equal(r.status,404);
 });
 await withEnv({NODE_ENV:'development',VERCEL_ENV:undefined,MEALCADDIE_ALLERGY_LAB:'true'},async()=>{
  assert.equal((await POST(new Request('https://preview.mealcaddie.app/api/labs/allergy-aware',{method:'POST',body:'{}'}))).status,404);
  assert.equal((await POST(new Request('http://localhost:3011/api/labs/allergy-aware',{method:'POST',headers:{Origin:'https://untrusted.example'},body:'{}'}))).status,403);
  assert.equal((await POST(new Request('http://localhost:3011/api/labs/allergy-aware',{method:'POST',body:'x'.repeat(20001)}))).status,413);
  const r=await POST(new Request('http://localhost:3011/api/labs/allergy-aware',{method:'POST',headers:{Origin:'http://localhost:3011'},body:JSON.stringify(base)}));assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
  assert.equal((await POST(new Request('http://localhost:3011/api/labs/allergy-aware',{method:'POST',headers:{Origin:'http://127.0.0.1:3011'},body:JSON.stringify(base)}))).status,200);
  assert.equal((await POST(new Request('http://localhost:3011/api/labs/allergy-aware',{method:'POST',headers:{Origin:'http://localhost:9999'},body:JSON.stringify(base)}))).status,403);
 });
 for(const path of ['lib/allergy-aware-planner.ts','app/api/labs/allergy-aware/route.ts'])assert.doesNotMatch(readFileSync(path,'utf8'),/supabase|openai|resend|stripe|fetch\(/i);
});
