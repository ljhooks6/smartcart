import {createHash} from 'node:crypto';
import {BudgetError} from './provider-attempt-budget.mjs';
import {loader} from './load-ts.mjs';
const {readDiet}=loader()('lib/dietary-safety.ts');
export const measuredFixture=[['Rice',8,'cup'],['Black beans',6,'cup'],['Chickpeas',6,'cup'],['Carrots',8,'each'],['Onions',6,'each'],['Tomatoes',6,'each'],['Garlic',12,'clove'],['Olive oil',16,'tbsp'],['Salt',4,'tsp'],['Black pepper',2,'tsp'],['Water',24,'cup']];
const hash=value=>createHash('sha256').update(value).digest('hex');
const inventoryKey=entries=>JSON.stringify(entries.map(e=>[e.name,e.quantity,e.unit,e.status]).sort((a,b)=>a[0].localeCompare(b[0])));
export async function authorizeLocalJob({budget,lab,prepared}){
 const person=lab.people.find(p=>p.key==='free');
 const {rows}=await lab.db.query('select id,input,result,status from public.smartcart_generation_jobs where owner_key=$1 and user_id=$2 and status=$3 order by created_at desc limit 1',['user:'+person.id,person.id,prepared.kind==='planning'?'running':'completed']);
 const job=rows[0];if(!job)throw new BudgetError('NO_APPROVED_LOCAL_JOB');
 const input=job.input,expected=measuredFixture.map(([name,quantity,unit])=>({name,quantity,unit,status:'owned'}));
 if(input.mealSourceMode!=='pantry-only'||input.householdSize!==2||input.budget!==60||input.prepTime!=='Under 1 hour'||JSON.stringify(input.availableEquipment)!==JSON.stringify(['Stovetop'])||input.includeDessert||input.includeBreakfast||input.includeLunch||input.avoidIngredients?.trim()||input.mustHaveIngredient?.trim()||input.restock?.length||!Array.isArray(input.pantryInventory)||inventoryKey(input.pantryInventory)!==inventoryKey(expected))throw new BudgetError('FIXTURE_MISMATCH');
 // The unrestricted value is reviewed, not derived by deleting a restriction.
 const {legacy,settings,malformed}=readDiet(input.diet);
 if(malformed||!['','No preference'].includes(legacy.trim())||Object.keys(settings).sort().join(',')!=='allergies,customAllergies,intolerances,medical,preferences'||settings.allergies.length||settings.preferences.length||settings.customAllergies.trim()||settings.intolerances.trim()||settings.medical.trim())throw new BudgetError('DIET_FIXTURE_MISMATCH');
 budget.bindJob(job.id,hash(JSON.stringify(input)));
 if(prepared.kind==='recipe'){
  const user=prepared.request.messages.find(m=>m.role==='user')?.content||'';
  const title=/^Meal title: (.+)$/m.exec(user)?.[1]?.trim();
  if(!title||!job.result?.meals?.some(m=>m.name===title))throw new BudgetError('RECIPE_OUTSIDE_PLAN');
  budget.bindRecipe(hash(job.id+'\n'+title));
 }
}
