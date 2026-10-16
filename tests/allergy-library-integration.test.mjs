import test from 'node:test';import assert from 'node:assert/strict';import {randomBytes,randomUUID} from 'node:crypto';import {readFileSync} from 'node:fs';
import {loader} from './helpers/load-local-ts.mjs';
import {libraryFixture,free,plus,admin,stranger,paid} from './helpers/allergy-library-fixture.mjs';
const load=loader(),{writeDiet}=load('lib/dietary-safety.ts'),{executeLibraryCommand,processLibraryJob}=load('lib/allergy-library-service.ts');
const {verifyLibraryPlan,signLibraryPlan}=load('lib/allergy-library-provenance.ts'),{createAllergyAwarePlan}=load('lib/allergy-aware-planner.ts');
const {reserveGenerationJob}=load('lib/generation-jobs.ts');
const diet=(allergies=['Milk','Eggs','Peanuts','Sesame'])=>writeDiet('No preference',{allergies,preferences:[],customAllergies:'',intolerances:'',medical:''});
const input={diet:diet(),householdSize:2,budget:150,count:7,includeDessert:true,availableEquipment:['Oven','Stovetop'],maxMinutes:60};
const keys={active:'local-v1',keys:{'local-v1':randomBytes(32).toString('base64url')}};
const active={NODE_ENV:'development',MEALCADDIE_ALLERGY_LAB:'true',MEALCADDIE_ALLERGY_INTEGRATION:'true',VERCEL_ENV:undefined,VERCEL:undefined};
async function env(values,fn){const old={};for(const [k,v]of Object.entries(values)){old[k]=process.env[k];if(v===undefined)delete process.env[k];else process.env[k]=v;}try{return await fn();}finally{for(const[k,v]of Object.entries(old))if(v===undefined)delete process.env[k];else process.env[k]=v;}}
function context(f,id=free){return {admin:f.admin,user:f.user(id),userId:id,allowlist:[free,plus,admin,paid],keys};}
const generation=(requestKey=randomUUID(),extra={})=>({action:'generate',requestKey,input:{...input,...extra},rejected:[]});

test('server provenance binds owner, audience, canonical recipe/catalog content, original restrictions and rotation keys',()=>{
 const plan=createAllergyAwarePlan(input).plan,token=signLibraryPlan(plan,free,randomUUID(),randomUUID(),keys);
 assert.equal(verifyLibraryPlan(token,free,keys).owner,free);
 assert.throws(()=>verifyLibraryPlan(token,plus,keys),/cannot be verified/);
 for(const changed of [token.replace('v1.','v2.'),token+'.extra',token.slice(0,-5)+'AAAAA'])assert.throws(()=>verifyLibraryPlan(changed,free,keys));
 const parts=token.split('.'),payload=JSON.parse(Buffer.from(parts[2],'base64url').toString());payload.input.diet=diet(['Sesame']);parts[2]=Buffer.from(JSON.stringify(payload)).toString('base64url');assert.throws(()=>verifyLibraryPlan(parts.join('.'),free,keys));
 const rotated={active:'local-v2',keys:{...keys.keys,'local-v2':randomBytes(32).toString('base64url')}};
 assert.equal(verifyLibraryPlan(token,free,rotated).owner,free);assert.throws(()=>verifyLibraryPlan(token,free,{active:'local-v2',keys:{'local-v2':rotated.keys['local-v2']}}));
 assert.throws(()=>signLibraryPlan(plan,free,randomUUID(),randomUUID(),{active:'short',keys:{short:'abc'}}));
 const oversized=JSON.parse(JSON.stringify(plan));oversized.snapshot.input.pantry=Array.from({length:100},(_,i)=>({name:'Unknown '+i+'x'.repeat(200),quantity:1,unit:'g'}));
 assert.throws(()=>signLibraryPlan(oversized,free,randomUUID(),randomUUID(),keys),e=>e.code==='PROVENANCE_SIZE');
});

test('real SQL jobs + RLS: Free journey, idempotency, signed saves, grocery checks, tampering and preserved content',()=>env(active,async()=>{
 const f=await libraryFixture();try{
  const c=context(f),before=(await f.db.query('select * from smartcart_profiles order by id')).rows;
  const first=generation();const result=await executeLibraryCommand(first,c);assert.equal(result.job.status,'completed');assert.equal(await f.count(),1);
  assert.equal((await executeLibraryCommand(first,c)).reused,true);assert.equal(await f.count(),1);
  await assert.rejects(executeLibraryCommand({...first,input:{...input,budget:151}},c),e=>e.status===409);
  const reopened=await executeLibraryCommand({action:'job',id:result.job.id,currentDiet:input.diet},c);assert.deepEqual(reopened.plan.recipeIds,result.plan.recipeIds);assert.equal(await f.count(),1);
  await assert.rejects(executeLibraryCommand({action:'job',id:result.job.id,currentDiet:input.diet},context(f,plus)),e=>e.status===404);
  const token=result.provenance;
  const rows=[];for(const recipeId of result.plan.recipeIds){const saved=await executeLibraryCommand({action:'save-vault',provenance:token,recipeId,currentDiet:input.diet},c);rows.push(saved.id);}
  assert.equal(rows.length,8);await executeLibraryCommand({action:'save-vault',provenance:token,recipeId:result.plan.recipeIds[0],currentDiet:input.diet},c);
  assert.equal((await f.db.query('select count(*)::int n from archived_meals where user_id=$1',[free])).rows[0].n,8);
  await f.db.query("insert into archived_meals(user_id,name) values($1,'Slot nine'),($1,'Slot ten')",[free]);
  await assert.rejects(executeLibraryCommand({action:'save-vault',provenance:token,recipeId:result.plan.recipeIds[0],currentDiet:input.diet},context(f,plus)),e=>e.code==='PROVENANCE_INVALID');
  const second=await executeLibraryCommand(generation(),c);
  await assert.rejects(executeLibraryCommand({action:'save-vault',provenance:second.provenance,recipeId:second.plan.recipeIds[0],currentDiet:input.diet},c),e=>e.code==='VAULT_SAVE');
  // Existing-row upserts at cap remain allowed and do not consume another slot.
  await executeLibraryCommand({action:'save-vault',provenance:token,recipeId:result.plan.recipeIds[0],currentDiet:input.diet},c);
  await f.db.query("delete from archived_meals where name in ('Slot nine','Slot ten')");
  const opened=await executeLibraryCommand({action:'open',table:'vault',id:rows[0],currentDiet:input.diet},c);assert.ok(opened.recipe.library.cacheKey);assert.equal(await f.count(),2);
  await assert.rejects(executeLibraryCommand({action:'open',table:'vault',id:rows[0],currentDiet:input.diet},context(f,plus)),e=>e.status===404);
  await f.db.query("update archived_meals set recipe_data=jsonb_set(recipe_data,'{name}','\"Forged peanut dessert\"') where id=$1",[rows[0]]);
  assert.notEqual((await executeLibraryCommand({action:'open',table:'vault',id:rows[0],currentDiet:input.diet},c)).recipe.name,'Forged peanut dessert');
  await f.db.query("update archived_meals set recipe_data=jsonb_set(recipe_data,'{library,provenance}','\"forged\"') where id=$1",[rows[0]]);
  await assert.rejects(executeLibraryCommand({action:'open',table:'vault',id:rows[0],currentDiet:input.diet},c),e=>e.code==='PROVENANCE_INVALID');
  await f.db.query("insert into archived_meals(user_id,name,recipe_data) values($1,'Old saved dinner','{\"ingredients\":[\"Milk\"]}')",[free]);
  const old=(await f.db.query("select id from archived_meals where name='Old saved dinner'")).rows[0].id;
  await assert.rejects(executeLibraryCommand({action:'open',table:'vault',id:old,currentDiet:input.diet},c),e=>e.code==='HISTORICAL_UNCHECKED');
  await executeLibraryCommand({action:'save-week',provenance:token,currentDiet:input.diet},c);
  assert.equal((await f.db.query("select count(*)::int n from weekly_menus where user_id=$1 and status='active_week'",[free])).rows[0].n,8);
  const proposed=result.plan.groceries.map(l=>({name:l.name,quantity:l.quantity,unit:l.unit}));
  await executeLibraryCommand({action:'groceries',provenance:token,proposed,currentDiet:input.diet},c);
  for(const changed of [[...proposed,{name:'Tahini',quantity:2,unit:'g'}],proposed.slice(1),proposed.map((v,i)=>i? v:{...v,quantity:v.quantity+1})])await assert.rejects(executeLibraryCommand({action:'groceries',provenance:token,proposed:changed,currentDiet:input.diet},c),e=>e.status===422);
  await assert.rejects(executeLibraryCommand({action:'save-vault',provenance:token,recipeId:result.plan.recipeIds[0],currentDiet:input.diet},context(f,plus)),e=>e.code==='PROVENANCE_INVALID');
  await assert.rejects(executeLibraryCommand(generation(randomUUID(),{diet:diet(['Milk','Fish'])}),c),e=>e.code==='SCOPE_UNSUPPORTED');assert.equal(await f.count(),2);
  await assert.rejects(executeLibraryCommand(first,context(f,stranger)),e=>e.code==='PILOT_REQUIRED');
  const failed=await executeLibraryCommand(generation(randomUUID(),{budget:.01}),c);assert.equal(failed.job.status,'failed');assert.equal(await f.count(),2);
  assert.deepEqual((await f.db.query('select * from smartcart_profiles order by id')).rows,before);assert.equal((await f.db.query('select count(*)::int n from smartcart_subscriptions')).rows[0].n,1);
 }finally{await f.db.close();}
}));

test('concurrent duplicate jobs cannot consume multiple allowances; denied scope and access never reserve',()=>env(active,async()=>{
 const f=await libraryFixture();try{
  const command=generation(),c=context(f);const results=await Promise.allSettled([executeLibraryCommand(command,c),executeLibraryCommand(command,c)]);
  assert.ok(results.some(r=>r.status==='fulfilled'));assert.equal(await f.count(),1);assert.equal((await executeLibraryCommand(command,c)).reused,true);
  await f.db.query('delete from beta_preserved_accounts where user_id=$1',[free]);
  await assert.rejects(executeLibraryCommand(generation(),c),e=>e.code==='ACCESS_REQUIRED');assert.equal(await f.count(),1);
 }finally{await f.db.close();}
}));

test('queued Plus expiry refunds reservation; stored/manual Plus remains Plus and content is preserved',()=>env(active,async()=>{
 const f=await libraryFixture();try{
  const c=context(f,plus);const body={budget:150,diet:input.diet,householdSize:2,combinedPantryItems:'',availableEquipment:input.availableEquipment,allergyLibrary:{mode:'allergy-library-v1',catalog:load('lib/allergy-aware-catalog.ts').catalogVersion,input}};
  const r=await reserveGenerationJob({owner:`user:${plus}`,quota:`user:${plus}`,userId:plus,plan:'plus'},randomUUID(),body,f.admin);
  await processLibraryJob(r.job.id,c);assert.equal((await f.db.query('select status from smartcart_generation_jobs where id=$1',[r.job.id])).rows[0].status,'failed');assert.equal(await f.count(),0);
  assert.equal((await f.db.query('select plan from smartcart_profiles where id=$1',[plus])).rows[0].plan,'free');
  assert.equal((await executeLibraryCommand(generation(),context(f,paid))).job.status,'completed');
  assert.equal((await f.db.query('select plan from smartcart_profiles where id=$1',[paid])).rows[0].plan,'plus');
 }finally{await f.db.close();}
}));

test('hosted / non-loopback / missing origins fail before credentials, DB or provider use',async()=>{
 const {POST,GET}=load('app/api/labs/allergy-library/route.ts');
 for(const VERCEL_ENV of ['production','preview'])await env({...active,VERCEL_ENV},async()=>{assert.equal((await POST(new Request('https://mealcaddie.app/api/labs/allergy-library',{method:'POST',body:'invalid'}))).status,404);assert.equal((await GET(new Request('https://mealcaddie.app/api/labs/allergy-library'))).status,404);});
 await env(active,async()=>{
  assert.equal((await POST(new Request('http://localhost:3011/api/labs/allergy-library',{method:'POST',body:'{}'}))).status,403);
  assert.equal((await POST(new Request('http://localhost:3011/api/labs/allergy-library',{method:'POST',headers:{Origin:'https://attacker.invalid'},body:'{}'}))).status,403);
  assert.equal((await POST(new Request('http://localhost:3011/api/labs/allergy-library',{method:'POST',headers:{Origin:'http://localhost:3011'},body:'{}'}))).status,401);
 });
 for(const file of ['lib/allergy-library-service.ts','lib/allergy-library-local.ts','app/api/labs/allergy-library/route.ts'])assert.doesNotMatch(readFileSync(file,'utf8'),/from ["'][^"']*(?:openai|resend|stripe|generation-dispatch)["']/);
});

test('recently rejected families persist only in their owner history; existing Free/Plus caps remain binding',()=>env(active,async()=>{
 const f=await libraryFixture();try{
  const jobs=await load('lib/allergy-aware-recipes.ts').reviewedRecipes.map(r=>({name:r.title}));
  await f.db.query("insert into smartcart_generation_jobs(owner_key,quota_key,user_id,request_key,input_hash,input,plan,status,result,created_at) values($1,$1,$2,$3,'history',$4,'free','completed',$5,now()-interval '1 hour')",[`user:${free}`,free,randomUUID(),JSON.stringify({recentRejectedMeals:['beef-zucchini']}),JSON.stringify({meals:[{name:'Red lentil and carrot soup'}]})]);
  await f.db.query("insert into smartcart_generation_jobs(owner_key,quota_key,user_id,request_key,input_hash,input,plan,status,result,created_at) values($1,$1,$2,$3,'foreign',$4,'free','completed',$5,now()-interval '1 hour')",[`user:${plus}`,plus,randomUUID(),JSON.stringify({recentRejectedMeals:jobs.slice(0,12).map(r=>r.name)}),JSON.stringify({meals:jobs})]);
  const result=await executeLibraryCommand(generation(),context(f));
  assert.ok(result.plan.meals.every(m=>m.family!=='ground-meat-vegetable-skillet'));
  assert.equal(result.plan.rotation.rejectedReused.length,0);
  assert.ok(result.plan.meals.every(m=>m.id!=='lentil-soup'));
  for(const [user,limit,tier] of [[free,5,'free'],[paid,20,'plus']]){
   const current=(await f.db.query("select count(*)::int n from smartcart_generation_jobs where user_id=$1 and status='completed'",[user])).rows[0].n;
   await f.db.query("insert into smartcart_generation_jobs(owner_key,quota_key,user_id,request_key,input_hash,input,plan,status,created_at) select $1,$1,$2,gen_random_uuid(),'quota','{}',$3,'completed',date_trunc('week',now() at time zone 'UTC') at time zone 'UTC' from generate_series(1,$4)",[`user:${user}`,user,tier,limit-current]);
   await assert.rejects(executeLibraryCommand(generation(),context(f,user)),e=>e.code==='limit'&&e.status===429);
  }
 }finally{await f.db.close();}
}));

test('misconfigured shared URL and swapped local keys fail closed without exposing a service key',()=>env(active,async()=>{
 const {localLibraryConfig}=load('lib/allergy-library-local.ts');
 const credential=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
 const config={MEALCADDIE_ALLERGY_LOCAL_SUPABASE_URL:'https://shared.example.invalid',MEALCADDIE_ALLERGY_LOCAL_ANON_KEY:credential('anon'),MEALCADDIE_ALLERGY_LOCAL_SERVICE_KEY:credential('service_role'),MEALCADDIE_ALLERGY_LOCAL_SIGNING_KEY:keys.keys['local-v1'],MEALCADDIE_ALLERGY_LOCAL_USER_IDS:free};
 await env(config,async()=>{assert.throws(()=>localLibraryConfig(),/loopback/);});
 await env({...config,MEALCADDIE_ALLERGY_LOCAL_SUPABASE_URL:'http://127.0.0.1:54335',MEALCADDIE_ALLERGY_LOCAL_ANON_KEY:credential('service_role')},async()=>{assert.throws(()=>localLibraryConfig(),/distinct local/);});
}));

test('ordinary tab adapter: chosen dinners/dessert, schedule, Vault restore/delete and canonical basket use signed identities',()=>env(active,async()=>{
 const f=await libraryFixture();try{
  const c=context(f),r=await executeLibraryCommand(generation(),c),currentDiet=input.diet;
  const refs=r.plan.meals.slice(0,2).concat(r.plan.meals.filter(m=>m.kind==='dessert')).map(m=>({provenance:r.provenance,recipeId:m.id}));
  refs[0].scheduledDay='Tuesday';
  await executeLibraryCommand({action:'selection',entries:refs,currentDiet},c);
  const inventory=await executeLibraryCommand({action:'inventory',currentDiet},c);
  assert.equal(inventory.week.length,3);assert.equal(inventory.weekBlocked,false);assert.equal(inventory.week.find(m=>m.id===refs[0].recipeId).scheduledDay,'Tuesday');
  const recipe=await executeLibraryCommand({action:'recipe',...refs[1],scheduledDay:undefined,currentDiet},c).catch(()=>null);
  // Strict input schemas reject even unrelated display/scheduling fields.
  assert.equal(recipe,null);
  const opened=await executeLibraryCommand({action:'recipe',provenance:r.provenance,recipeId:refs[1].recipeId,currentDiet},c);
  assert.ok(opened.recipe.ingredients.every(i=>i.amount&&i.price>=0));assert.ok(opened.recipe.notes.includes('Engineering candidate'));
  const basket=await executeLibraryCommand({action:'basket',entries:refs,currentDiet},c);
  const amounts=new Map();for(const m of inventory.week)for(const i of m.ingredients)amounts.set(i.foodId,(amounts.get(i.foodId)??0)+i.quantity);
  for(const i of basket.groceries)assert.equal(i.quantity,Math.round(amounts.get(i.foodId)*1000)/1000);
  assert.equal((await executeLibraryCommand({action:'basket',entries:refs,proposed:[...basket.groceries].reverse(),currentDiet},c)).groceries.length,basket.groceries.length);
  for(const proposed of [basket.groceries.slice(1),basket.groceries.map((i,n)=>n?i:{...i,unit:'each'}),basket.groceries.map((i,n)=>n?i:{...i,name:'Tahini'}),[...basket.groceries,basket.groceries[0]]])await assert.rejects(executeLibraryCommand({action:'basket',entries:refs,proposed,currentDiet},c),e=>e.code==='GROCERY_CHANGED');
  await assert.rejects(executeLibraryCommand({action:'selection',entries:[refs[0],refs[0]],currentDiet},c),e=>e.code==='DUPLICATE_RECIPE');
  const saved=await executeLibraryCommand({action:'save-vault',provenance:r.provenance,recipeId:refs[0].recipeId,currentDiet},c);
  await executeLibraryCommand({action:'delete-vault',id:saved.id,currentDiet},context(f,plus));assert.equal((await executeLibraryCommand({action:'inventory',currentDiet},c)).vault.length,1);
  await executeLibraryCommand({action:'delete-vault',id:saved.id,currentDiet},c);assert.equal((await executeLibraryCommand({action:'inventory',currentDiet},c)).vault.length,0);
  assert.equal(await f.count(),1);
 }finally{await f.db.close();}
}));

test('current restrictions cannot strip signed original restrictions; retired keys, altered stored data and historical week fail closed',()=>env(active,async()=>{
 const f=await libraryFixture();try{
  const c=context(f),r=await executeLibraryCommand(generation(),c),currentDiet=diet(['Sesame']);
  const restored=await executeLibraryCommand({action:'artifact',provenance:r.provenance,currentDiet},c);
  assert.deepEqual([...restored.plan.policy.allergies].sort(),['Eggs','Milk','Peanuts','Sesame']);
  assert.notEqual(restored.recipes[0].library.cacheKey,r.recipes[0].library.cacheKey);
  await assert.rejects(executeLibraryCommand({action:'recipe',provenance:r.provenance,recipeId:r.plan.recipeIds[0],currentDiet,avoidIngredients:r.plan.meals[0].ingredients[0].name},c),e=>e.status===422);
  await executeLibraryCommand({action:'save-week',provenance:r.provenance,currentDiet},c);
  await f.db.query("update weekly_menus set recipe_data=jsonb_set(recipe_data,'{ingredients}','[{\"name\":\"Tahini\",\"quantity\":900}]') where user_id=$1",[free]);
  const inventory=await executeLibraryCommand({action:'inventory',currentDiet},c);assert.ok(inventory.week.every(m=>m.ingredients.every(i=>i.name!=='Tahini')));
  const rotated={...c,keys:{active:'local-v2',keys:{...keys.keys,'local-v2':randomBytes(32).toString('base64url')}}};
  assert.equal((await executeLibraryCommand({action:'inventory',currentDiet},rotated)).week.length,8);
  const retired={...c,keys:{active:'local-v2',keys:{'local-v2':rotated.keys.keys['local-v2']}}};
  const withheld=await executeLibraryCommand({action:'inventory',currentDiet},retired);assert.equal(withheld.week.length,0);assert.equal(withheld.weekBlocked,true);assert.equal(withheld.unavailable,8);
  await assert.rejects(executeLibraryCommand({action:'artifact',provenance:r.provenance,currentDiet},retired),e=>e.code==='PROVENANCE_INVALID');
  await f.db.query("insert into weekly_menus(user_id,meal_title,status,recipe_data) values($1,'Historical meal','active_week','{}')",[free]);
  const count=(await f.db.query('select count(*)::int n from weekly_menus')).rows[0].n;
  await assert.rejects(executeLibraryCommand({action:'selection',entries:[],currentDiet},c),e=>e.code==='WEEK_REVIEW_REQUIRED');
  assert.equal((await f.db.query('select count(*)::int n from weekly_menus')).rows[0].n,count);
 }finally{await f.db.close();}
}));

test('local key ring validates active/retained keys without exposing them; real app entry remains hosted-disabled',()=>env(active,async()=>{
 const {localLibraryConfig,localLibraryBrowserConfigured}=load('lib/allergy-library-local.ts');
 const credential=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
 const config={MEALCADDIE_ALLERGY_LOCAL_SUPABASE_URL:'http://127.0.0.1:54335',MEALCADDIE_ALLERGY_LOCAL_ANON_KEY:credential('anon'),MEALCADDIE_ALLERGY_LOCAL_SERVICE_KEY:credential('service_role'),MEALCADDIE_ALLERGY_LOCAL_SIGNING_KEY:keys.keys['local-v1'],MEALCADDIE_ALLERGY_LOCAL_USER_IDS:free};
 const ring={active:'local-v2',keys:{...keys.keys,'local-v2':randomBytes(32).toString('base64url')}};
 await env({...config,MEALCADDIE_ALLERGY_LOCAL_KEY_RING:JSON.stringify(ring)},async()=>{assert.equal(localLibraryConfig().keys.active,'local-v2');});
 await env({...config,NEXT_PUBLIC_SUPABASE_URL:'https://shared.example.invalid',NEXT_PUBLIC_SUPABASE_ANON_KEY:credential('anon')},async()=>assert.equal(localLibraryBrowserConfigured(),false));
 await env({...config,NEXT_PUBLIC_SUPABASE_URL:config.MEALCADDIE_ALLERGY_LOCAL_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:credential('anon')},async()=>assert.equal(localLibraryBrowserConfigured(),true));
 for(const bad of ['invalid',JSON.stringify({...ring,active:'absent'}),JSON.stringify({...ring,keys:{'local-v2':'abc'}})])await env({...config,MEALCADDIE_ALLERGY_LOCAL_KEY_RING:bad},async()=>assert.throws(()=>localLibraryConfig(),/key ring/));
 const source=readFileSync('components/allergy-library-application.tsx','utf8');assert.doesNotMatch(source,/from ["'].*(?:\/supabase|use-smart-cart-recipe|use-generation-job)["']/);
 for(const name of ['WeekDashboard','MealSections','CookSections','LibrarySections','GrocerySidebar','RecipeModal'])assert.ok(source.includes('SmartCart'+name));
 assert.match(readFileSync('app/labs/allergy-aware/app/page.tsx','utf8'),/if\(!localLibraryEnabled\(\)\)notFound\(\)/);
 assert.equal(JSON.parse(readFileSync('vercel.json')).git.deploymentEnabled['feature/allergy-aware-candidate'],false);
}));
